# 01 · Smart Contract 详细设计

> 历史原型参考文档：下文记录原有 EVM 实现。当前前端默认展示 Solana 迁移预览，旧前端模块位于 `web/legacy/evm/`；Solana 合约将另行重写。

> 目标：Solidity Dev 打开本文件，13:00 开始写，14:30 前完成 + 测试 + 部署到 Fuji。

## 1. 项目初始化（15 分钟）

```bash
mkdir contracts && cd contracts
forge init --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit
```

在 `foundry.toml` 里加：

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
fuji = "https://api.avax-test.network/ext/bc/C/rpc"

[etherscan]
fuji = { key = "${SNOWTRACE_API_KEY}", url = "https://api-testnet.snowtrace.io/api" }
```

在 `remappings.txt` 里加：

```
@openzeppelin/=lib/openzeppelin-contracts/
```

---

## 2. `src/MockUSDC.sol`（复制即可）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fuji 测试用 USDC，6 decimals，任何人可 mint
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice 演示用：任何地址可以 mint，方便 Demo 现场发钱
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

---

## 3. `src/Escrow.sol`（核心合约，300 行内）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SolPact
/// @notice 里程碑式无信任托管：Buyer 存 USDC → Seller 交付 → Buyer 确认 → 自动释放
contract Escrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Types ============
    enum ProjectStatus { Created, Funded, Completed, Cancelled }
    enum MilestoneStatus { Pending, Submitted, Approved, Disputed, Refunded }

    struct Milestone {
        string description;
        uint256 amount;         // USDC 数量（6 decimals）
        uint256 deadline;       // Seller 交付截止时间（超时 Buyer 可退款）
        MilestoneStatus status;
        string deliverableURI;  // IPFS CID / URL / 描述文本
        uint256 submittedAt;
    }

    struct Project {
        address buyer;
        address seller;
        address arbitrator;     // address(0) 表示无仲裁员
        IERC20  token;          // USDC 合约地址
        uint256 totalAmount;
        uint256 releasedAmount;
        ProjectStatus status;
        uint256 createdAt;
        uint256 autoReleaseWindow; // Seller 交付后 X 秒 Buyer 若不响应，Seller 可自取
    }

    // ============ Storage ============
    uint256 public nextProjectId;
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone[]) private _milestones;

    // ============ Events ============
    event ProjectCreated(uint256 indexed projectId, address indexed buyer, address indexed seller, uint256 totalAmount, uint256 milestoneCount);
    event Deposited(uint256 indexed projectId, uint256 amount);
    event DeliverySubmitted(uint256 indexed projectId, uint256 indexed milestoneIndex, string uri);
    event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneIndex, uint256 amount);
    event DisputeRaised(uint256 indexed projectId, uint256 indexed milestoneIndex, address raisedBy);
    event DisputeResolved(uint256 indexed projectId, uint256 indexed milestoneIndex, uint256 sellerShareBps);
    event AutoReleased(uint256 indexed projectId, uint256 indexed milestoneIndex);
    event Refunded(uint256 indexed projectId, uint256 indexed milestoneIndex);

    // ============ Modifiers ============
    modifier onlyBuyer(uint256 pid) { require(msg.sender == projects[pid].buyer, "not buyer"); _; }
    modifier onlySeller(uint256 pid) { require(msg.sender == projects[pid].seller, "not seller"); _; }
    modifier onlyArbitrator(uint256 pid) { require(msg.sender == projects[pid].arbitrator, "not arbitrator"); _; }

    // ============ Actions ============

    /// @notice Buyer 创建项目（此时不转钱，只登记里程碑）
    function createProject(
        address seller,
        address arbitrator,
        address token,
        string[] calldata descriptions,
        uint256[] calldata amounts,
        uint256[] calldata deadlines,
        uint256 autoReleaseWindow
    ) external returns (uint256 projectId) {
        require(seller != address(0) && seller != msg.sender, "invalid seller");
        require(token != address(0), "invalid token");
        require(descriptions.length == amounts.length && amounts.length == deadlines.length, "length mismatch");
        require(descriptions.length > 0 && descriptions.length <= 20, "milestone count out of range");
        require(autoReleaseWindow >= 1 hours && autoReleaseWindow <= 90 days, "window out of range");

        projectId = nextProjectId++;
        Project storage p = projects[projectId];
        p.buyer = msg.sender;
        p.seller = seller;
        p.arbitrator = arbitrator;
        p.token = IERC20(token);
        p.status = ProjectStatus.Created;
        p.createdAt = block.timestamp;
        p.autoReleaseWindow = autoReleaseWindow;

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "zero amount");
            require(deadlines[i] > block.timestamp, "past deadline");
            total += amounts[i];
            _milestones[projectId].push(Milestone({
                description: descriptions[i],
                amount: amounts[i],
                deadline: deadlines[i],
                status: MilestoneStatus.Pending,
                deliverableURI: "",
                submittedAt: 0
            }));
        }
        p.totalAmount = total;

        emit ProjectCreated(projectId, msg.sender, seller, total, amounts.length);
    }

    /// @notice Buyer 存款（需提前 approve token）
    function deposit(uint256 projectId) external nonReentrant onlyBuyer(projectId) {
        Project storage p = projects[projectId];
        require(p.status == ProjectStatus.Created, "already funded");
        p.status = ProjectStatus.Funded;
        p.token.safeTransferFrom(msg.sender, address(this), p.totalAmount);
        emit Deposited(projectId, p.totalAmount);
    }

    /// @notice Seller 提交某里程碑的交付物
    function submitDelivery(uint256 projectId, uint256 milestoneIndex, string calldata uri)
        external onlySeller(projectId)
    {
        Project storage p = projects[projectId];
        require(p.status == ProjectStatus.Funded, "not funded");
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Pending, "not pending");

        m.status = MilestoneStatus.Submitted;
        m.deliverableURI = uri;
        m.submittedAt = block.timestamp;
        emit DeliverySubmitted(projectId, milestoneIndex, uri);
    }

    /// @notice Buyer 确认某里程碑，立即释放该里程碑金额给 Seller
    function approveMilestone(uint256 projectId, uint256 milestoneIndex)
        external nonReentrant onlyBuyer(projectId)
    {
        _releaseToSeller(projectId, milestoneIndex);
    }

    /// @notice Seller 在 Buyer 长时间不确认时自动提取（防赖账）
    function claimAutoRelease(uint256 projectId, uint256 milestoneIndex)
        external nonReentrant onlySeller(projectId)
    {
        Project storage p = projects[projectId];
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "not submitted");
        require(block.timestamp >= m.submittedAt + p.autoReleaseWindow, "too early");
        _releaseToSeller(projectId, milestoneIndex);
        emit AutoReleased(projectId, milestoneIndex);
    }

    /// @notice Buyer 在 Seller 逾期未交付时申请退款
    function refundOnDeadlineMiss(uint256 projectId, uint256 milestoneIndex)
        external nonReentrant onlyBuyer(projectId)
    {
        Project storage p = projects[projectId];
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Pending, "not refundable");
        require(block.timestamp > m.deadline, "not overdue");

        m.status = MilestoneStatus.Refunded;
        p.releasedAmount += m.amount;
        p.token.safeTransfer(p.buyer, m.amount);
        emit Refunded(projectId, milestoneIndex);
        _tryComplete(projectId);
    }

    /// @notice 任一方对已提交的里程碑发起争议
    function raiseDispute(uint256 projectId, uint256 milestoneIndex) external {
        Project storage p = projects[projectId];
        require(msg.sender == p.buyer || msg.sender == p.seller, "not party");
        require(p.arbitrator != address(0), "no arbitrator");
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "not disputable");

        m.status = MilestoneStatus.Disputed;
        emit DisputeRaised(projectId, milestoneIndex, msg.sender);
    }

    /// @notice 仲裁员决定 Seller 拿多少百分比（0–10000 bps，即 0–100%）
    function resolveDispute(uint256 projectId, uint256 milestoneIndex, uint256 sellerShareBps)
        external nonReentrant onlyArbitrator(projectId)
    {
        Project storage p = projects[projectId];
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Disputed, "not disputed");
        require(sellerShareBps <= 10_000, "invalid bps");

        uint256 sellerPayout = (m.amount * sellerShareBps) / 10_000;
        uint256 buyerRefund = m.amount - sellerPayout;

        m.status = MilestoneStatus.Approved;
        p.releasedAmount += m.amount;

        if (sellerPayout > 0) p.token.safeTransfer(p.seller, sellerPayout);
        if (buyerRefund > 0) p.token.safeTransfer(p.buyer, buyerRefund);

        emit DisputeResolved(projectId, milestoneIndex, sellerShareBps);
        _tryComplete(projectId);
    }

    // ============ Views ============
    function getMilestones(uint256 projectId) external view returns (Milestone[] memory) {
        return _milestones[projectId];
    }
    function getMilestoneCount(uint256 projectId) external view returns (uint256) {
        return _milestones[projectId].length;
    }

    // ============ Internal ============
    function _releaseToSeller(uint256 projectId, uint256 milestoneIndex) internal {
        Project storage p = projects[projectId];
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "not submitted");
        m.status = MilestoneStatus.Approved;
        p.releasedAmount += m.amount;
        p.token.safeTransfer(p.seller, m.amount);
        emit MilestoneApproved(projectId, milestoneIndex, m.amount);
        _tryComplete(projectId);
    }

    function _tryComplete(uint256 projectId) internal {
        Project storage p = projects[projectId];
        if (p.releasedAmount == p.totalAmount) {
            p.status = ProjectStatus.Completed;
        }
    }
}
```

**设计要点解释**：

| 决策 | 原因 |
|-----|------|
| 单一合约 + `mapping(id => Project)` | 比 Factory 模式少 30% 代码，1 天时间够用 |
| `autoReleaseWindow` 双向保护 | Seller 交付后 Buyer 不响应 → Seller 可自取；Seller 逾期未交付 → Buyer 可退款 |
| `sellerShareBps` 而不是 `winner` | 支持仲裁员判"Seller 拿 70%、Buyer 退 30%" 这种真实场景 |
| 事件全部 `indexed` 到 projectId | 前端可用 `useWatchContractEvent` 精准订阅单个项目 |
| 不做可升级代理 | Demo 不需要，反而增加复杂度 |
| Milestone 存独立 mapping | Struct-in-struct 的 Solidity 内存管理坑多，独立 mapping 更稳 |

---

## 4. `test/Escrow.t.sol`（最少必须通过 6 个用例）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/MockUSDC.sol";

contract EscrowTest is Test {
    Escrow escrow;
    MockUSDC usdc;
    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");
    address arbitrator = makeAddr("arbitrator");

    function setUp() public {
        escrow = new Escrow();
        usdc = new MockUSDC();
        usdc.mint(buyer, 10_000e6);
    }

    function _createSingleMilestone(uint256 amount) internal returns (uint256 pid) {
        string[] memory desc = new string[](1);
        uint256[] memory amt = new uint256[](1);
        uint256[] memory dl  = new uint256[](1);
        desc[0] = "Deliver X"; amt[0] = amount; dl[0] = block.timestamp + 7 days;

        vm.prank(buyer);
        pid = escrow.createProject(seller, arbitrator, address(usdc), desc, amt, dl, 3 days);
    }

    function test_HappyPath_CreateDepositSubmitApprove() public {
        uint256 pid = _createSingleMilestone(1000e6);

        vm.prank(buyer);
        usdc.approve(address(escrow), 1000e6);
        vm.prank(buyer);
        escrow.deposit(pid);
        assertEq(usdc.balanceOf(address(escrow)), 1000e6);

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "ipfs://Qm...");

        vm.prank(buyer);
        escrow.approveMilestone(pid, 0);

        assertEq(usdc.balanceOf(seller), 1000e6);
    }

    function test_RefundOnDeadlineMiss() public {
        uint256 pid = _createSingleMilestone(500e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 500e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.warp(block.timestamp + 8 days);
        vm.prank(buyer);
        escrow.refundOnDeadlineMiss(pid, 0);
        assertEq(usdc.balanceOf(buyer), 10_000e6); // 全额退回
    }

    function test_ClaimAutoRelease_TooEarly_Reverts() public {
        uint256 pid = _createSingleMilestone(500e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 500e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");

        vm.prank(seller);
        vm.expectRevert(bytes("too early"));
        escrow.claimAutoRelease(pid, 0);
    }

    function test_ClaimAutoRelease_AfterWindow_Succeeds() public {
        uint256 pid = _createSingleMilestone(500e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 500e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");
        vm.warp(block.timestamp + 3 days + 1);
        vm.prank(seller);
        escrow.claimAutoRelease(pid, 0);
        assertEq(usdc.balanceOf(seller), 500e6);
    }

    function test_DisputeResolve_SplitFunds() public {
        uint256 pid = _createSingleMilestone(1000e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 1000e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");
        vm.prank(buyer);
        escrow.raiseDispute(pid, 0);

        vm.prank(arbitrator);
        escrow.resolveDispute(pid, 0, 7000); // Seller 70%

        assertEq(usdc.balanceOf(seller), 700e6);
        assertEq(usdc.balanceOf(buyer), 9_300e6);
    }

    function test_OnlyBuyerCanApprove() public {
        uint256 pid = _createSingleMilestone(100e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 100e6);
        escrow.deposit(pid);
        vm.stopPrank();
        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");

        vm.prank(seller);
        vm.expectRevert(bytes("not buyer"));
        escrow.approveMilestone(pid, 0);
    }
}
```

跑测试：

```bash
forge test -vv
```

**通过标准**：6 个用例全绿。如果 `test_ClaimAutoRelease_AfterWindow` 挂了，检查 `autoReleaseWindow` 是不是设的 3 days 而 warp 也是 3 days（要 +1）。

---

## 5. `script/Deploy.s.sol`（部署脚本）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Escrow.sol";
import "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address demoBuyer = vm.envAddress("DEMO_BUYER");
        address demoSeller = vm.envAddress("DEMO_SELLER");

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC();
        Escrow escrow = new Escrow();

        // 提前给 Demo 钱包发钱，现场不用等 mint
        usdc.mint(demoBuyer, 10_000e6);
        usdc.mint(demoSeller, 100e6); // Seller 也来点，付 gas 之外的心理感

        console2.log("USDC:", address(usdc));
        console2.log("Escrow:", address(escrow));

        vm.stopBroadcast();
    }
}
```

部署命令（详见 `03-deployment.md`）：

```bash
forge script script/Deploy.s.sol --rpc-url fuji --broadcast --verify
```

---

## 6. 完成检查清单（Solidity Dev 交接前）

- [ ] `forge test -vv` 全绿
- [ ] `forge build` 无 warning
- [ ] 已部署到 Fuji，拿到两个地址（USDC + Escrow）
- [ ] 已把地址和 ABI 交给 Frontend Dev（截图或贴群）
- [ ] 用测试脚本或 `cast` 至少手动跑通一次 create → deposit → submit → approve
- [ ] Snowtrace 上能看到交易（把链接备好，Demo 时用）
