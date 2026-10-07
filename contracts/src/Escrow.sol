// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SolPact Escrow
/// @notice Milestone escrow: Buyer deposits USDC → Seller delivers → Buyer approves → funds release
contract Escrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ProjectStatus {
        Created,
        Funded,
        Completed,
        Cancelled
    }

    enum MilestoneStatus {
        Pending,
        Submitted,
        Approved,
        Disputed,
        Refunded
    }

    struct Milestone {
        string description;
        uint256 amount;
        uint256 deadline;
        MilestoneStatus status;
        string deliverableURI;
        uint256 submittedAt;
    }

    struct Project {
        address buyer;
        address seller;
        address arbitrator;
        IERC20 token;
        uint256 totalAmount;
        uint256 releasedAmount;
        ProjectStatus status;
        uint256 createdAt;
        uint256 autoReleaseWindow;
    }

    uint256 public nextProjectId;
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone[]) private _milestones;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        uint256 milestoneCount
    );
    event Deposited(uint256 indexed projectId, uint256 amount);
    event DeliverySubmitted(uint256 indexed projectId, uint256 indexed milestoneIndex, string uri);
    event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneIndex, uint256 amount);
    event DisputeRaised(uint256 indexed projectId, uint256 indexed milestoneIndex, address raisedBy);
    event DisputeResolved(uint256 indexed projectId, uint256 indexed milestoneIndex, uint256 sellerShareBps);
    event AutoReleased(uint256 indexed projectId, uint256 indexed milestoneIndex);
    event Refunded(uint256 indexed projectId, uint256 indexed milestoneIndex);

    modifier onlyBuyer(uint256 pid) {
        require(msg.sender == projects[pid].buyer, "not buyer");
        _;
    }

    modifier onlySeller(uint256 pid) {
        require(msg.sender == projects[pid].seller, "not seller");
        _;
    }

    modifier onlyArbitrator(uint256 pid) {
        require(msg.sender == projects[pid].arbitrator, "not arbitrator");
        _;
    }

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
        require(
            descriptions.length == amounts.length && amounts.length == deadlines.length,
            "length mismatch"
        );
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
            _milestones[projectId].push(
                Milestone({
                    description: descriptions[i],
                    amount: amounts[i],
                    deadline: deadlines[i],
                    status: MilestoneStatus.Pending,
                    deliverableURI: "",
                    submittedAt: 0
                })
            );
        }
        p.totalAmount = total;

        emit ProjectCreated(projectId, msg.sender, seller, total, amounts.length);
    }

    function deposit(uint256 projectId) external nonReentrant onlyBuyer(projectId) {
        Project storage p = projects[projectId];
        require(p.status == ProjectStatus.Created, "already funded");
        p.status = ProjectStatus.Funded;
        p.token.safeTransferFrom(msg.sender, address(this), p.totalAmount);
        emit Deposited(projectId, p.totalAmount);
    }

    function submitDelivery(uint256 projectId, uint256 milestoneIndex, string calldata uri)
        external
        onlySeller(projectId)
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

    function approveMilestone(uint256 projectId, uint256 milestoneIndex)
        external
        nonReentrant
        onlyBuyer(projectId)
    {
        _releaseToSeller(projectId, milestoneIndex);
    }

    function claimAutoRelease(uint256 projectId, uint256 milestoneIndex)
        external
        nonReentrant
        onlySeller(projectId)
    {
        Project storage p = projects[projectId];
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "not submitted");
        require(block.timestamp >= m.submittedAt + p.autoReleaseWindow, "too early");
        _releaseToSeller(projectId, milestoneIndex);
        emit AutoReleased(projectId, milestoneIndex);
    }

    function refundOnDeadlineMiss(uint256 projectId, uint256 milestoneIndex)
        external
        nonReentrant
        onlyBuyer(projectId)
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

    function raiseDispute(uint256 projectId, uint256 milestoneIndex) external {
        Project storage p = projects[projectId];
        require(msg.sender == p.buyer || msg.sender == p.seller, "not party");
        require(p.arbitrator != address(0), "no arbitrator");
        Milestone storage m = _milestones[projectId][milestoneIndex];
        require(m.status == MilestoneStatus.Submitted, "not disputable");

        m.status = MilestoneStatus.Disputed;
        emit DisputeRaised(projectId, milestoneIndex, msg.sender);
    }

    function resolveDispute(uint256 projectId, uint256 milestoneIndex, uint256 sellerShareBps)
        external
        nonReentrant
        onlyArbitrator(projectId)
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

    function getMilestones(uint256 projectId) external view returns (Milestone[] memory) {
        return _milestones[projectId];
    }

    function getMilestoneCount(uint256 projectId) external view returns (uint256) {
        return _milestones[projectId].length;
    }

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
