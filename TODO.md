# TODO — SolPact

## Solana migration

- [x] Unify SolPact branding and visible network copy around Solana.
- [x] Isolate the original EVM frontend behind an explicit legacy-demo flag.
- [x] Provide labeled sample project pages and an editable form during migration.
- [x] Rewrite and deploy the Solana escrow program to Devnet.
- [x] Complete real Devnet protocol tests, including the one-hour automatic release window (175 transactions, 83 assertions).
- [x] Remove the old Avalanche contract workspace; preserve source history and record the unclaimed Fuji test balances.
- [x] Integrate Phantom-first wallet connection, Solflare support, account events, and Devnet balance queries.
- [x] Validate counterparty public keys against the deployed program’s rules.
- [x] Implement SPL USDC deposits, releases, refunds, and disputes in the program.
- [x] Read real program accounts and confirm submitted transactions.
- [ ] Validate the full buyer/seller wallet workflow on Devnet.

## Historical prototype checklist

The checklist below records the original implementation. Its `contracts/` paths refer to the archived workspace in Git history, not the current checkout. The `docs/` reference files are maintained locally and are not versioned.

> ⏰ Coding 时间窗口：13:00–17:30（4.5h）
> 📌 规则：P0 = 不做就不能 Demo，P1 = 加分项，P2 = Roadmap 话术

---

## Phase 0 · 环境准备（13:00–13:30）

### 基础设施
- [x] `git init`（本地仓库已初始化）
- [x] 用 `cast wallet new` 生成 3 个测试钱包（Deployer / Buyer / Seller），私钥写在 `contracts/.env`
- [x] 安装 [Avalanche Core](https://core.app/)（浏览器扩展）—— **默认 Demo 钱包**
- [ ] Core 中导入 Buyer / Seller 私钥（Deployer 已导入；Buyer/Seller 需你在扩展里确认）
- [x] Core / 链上使用 **Avalanche Fuji C-Chain**（Deployer+Buyer 领水、Seller 由 Buyer 转入 0.5 AVAX）
- [x] 三个地址都有 Fuji AVAX（Deployer faucet / Buyer faucet / Seller 转账）
- [ ] 注册 WalletConnect Cloud → 拿到 Project ID（`web/.env.local` 仍是占位符；Core 注入连接一般仍可用）

### 合约环境（Person A）
- [x] `mkdir contracts && cd contracts && forge init --no-commit`
- [x] `forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-commit`
- [x] 配置 `foundry.toml`（solc 0.8.20 / optimizer / fuji rpc）
- [x] 配置 `remappings.txt`（`@openzeppelin/=lib/openzeppelin-contracts/`）

### 前端环境（Person B）
- [x] `npx create-next-app@latest web --typescript --tailwind --eslint --app`
- [x] `cd web && pnpm add wagmi viem @tanstack/react-query @rainbow-me/rainbowkit`
- [x] shadcn-style UI components (manual)
- [x] UI primitives: button/card/input/label/textarea/badge
- [x] 创建 `lib/wagmi.ts` + `providers.tsx` + 挂到 `layout.tsx`

---

## Phase 1 · 核心合约（13:30–14:30）⬅ P0

### MockUSDC.sol
- [x] ERC20，6 decimals，公开 `mint(address, uint256)` 函数
- [x] 编译通过

### Escrow.sol — 数据结构 & 事件
- [x] 定义 `ProjectStatus` / `MilestoneStatus` 枚举
- [x] 定义 `Project` / `Milestone` 结构体
- [x] 定义 `nextProjectId` + `projects` mapping + `_milestones` mapping
- [x] 定义 6 个核心 Event
- [x] 定义 modifier: `onlyBuyer` / `onlySeller` / `onlyArbitrator`

### Escrow.sol — 核心函数（Happy Path）
- [x] `createProject()` / `deposit()` / `submitDelivery()` / `approveMilestone()`
- [x] `_releaseToSeller()` / `_tryComplete()`

### Escrow.sol — 逃生舱
- [x] `claimAutoRelease()` / `refundOnDeadlineMiss()` / `raiseDispute()` / `resolveDispute()`

### Escrow.sol — 查询
- [x] `getMilestones(projectId)` / `getMilestoneCount(projectId)`

### 测试
- [x] 6 个单元测试全绿
- [x] `forge test -vv` 通过
- [x] Fuzz：`testFuzz_ApprovePaysExactAmount` + create 金额（64 runs 全绿）

---

## Phase 2 · 前端页面（13:30–16:00）⬅ P0

### 公共模块
- [x] `lib/contracts.ts` / `lib/format.ts` / `ProjectStatusBadge` / `MilestoneCard`
- [x] 交易成功 toast → Snowtrace 跳转
- [x] 里程碑 Deadline 倒计时（`DeadlineCountdown`）

### 页面
- [x] Landing `/` · Dashboard · Create · Project Detail（含事件订阅）

---

## Phase 3 · 部署 & 集成（14:30–16:30）⬅ P0

### 合约部署
- [x] `script/Deploy.s.sol`
- [x] `forge script … --rpc-url fuji --broadcast --legacy`
- [x] Escrow = `0x6df99e9f713aB9ECb57fa4842660CBdE0c000Eeb` / USDC = `0x0bA33E7Ac0c997fF627a8AE1FF86f1ca01618ff1`
- [x] ABI 已导出到 `web/lib/abi/`
- [x] Snowtrace 上合约有 bytecode（codesize USDC 1882 / Escrow 7791）

### 合约手动验证（cast）
- [x] `cast codesize` 非空
- [x] Buyer 初始 mint 10000000000；Happy Path 后 Buyer 9800 USDC / Seller 300 USDC

### 前端集成
- [x] `web/.env.local` 已填真地址
- [x] `pnpm dev` 本地启动（http://localhost:3000）
- [x] Happy Path **链上已跑通**（`script/DemoHappyPath.s.sol`）：create → deposit → submit → approve
  - Project `#0` status = Completed
  - Seller USDC：100 → **300**（+200 释放）
- [ ] Buyer 用 Core 在浏览器里再走一遍（UI 签名；链上脚本不能代替现场 Demo）
- [ ] Seller 用 Core 第二个 profile 连 dApp（需你本地操作）

### Vercel 部署
- [ ] `vercel --prod` — CLI 已登录，两次部署均 `fetch failed`（Vercel 网络/API），本地 `pnpm build` 是绿的
- [ ] 公网 URL 端到端跑通（被上一则挡住）

---

## Phase 4 · Demo 准备（17:00–17:30）⬅ P0

### 环境
- [ ] 两个浏览器窗口：Buyer（Chrome 主 profile + Core）+ Seller（Guest + Core）
- [ ] 两个 Core 账号均已连接 dApp，网络为 Fuji C-Chain
- [x] Buyer 有 AVAX + USDC（Happy Path 后约 1.5 AVAX / 9800 USDC）
- [x] Seller 有 AVAX + USDC（0.5 AVAX / **300 USDC**。部署时 mint 了 100，Approve 又 +200。演示新项目时到账对比仍成立）
- [ ] Snowtrace 页签预打开：[Escrow](https://testnet.snowtrace.io/address/0x6df99e9f713aB9ECb57fa4842660CBdE0c000Eeb)

### 兜底 / 排练 / 提交
- [ ] 录制 3–5 分钟完整流程视频 → 桌面 `demo-backup.mp4`（需你本机录屏）
- [ ] 读 `docs/05-demo-day.md` 并排练（需人）
- [x] Demo slides：`docs/demo-slides.html` 与 http://localhost:3000/demo-slides.html
- [x] `git add && git commit`（本地初始提交已完成；push / GitHub Public 需你加 remote）
- [ ] GitHub repo Public + README 填团队成员

---

## Phase 5 · 加分项（P1）

- [ ] Chainlink Automation — **不做**（要独立喂价/Automation 注册，超出剩余时间）
- [ ] Snowtrace Verify — **不做**（无 `SNOWTRACE_API_KEY`）
- [x] 交易 hash → Snowtrace 跳转
- [x] 里程碑 Deadline 倒计时
- [ ] 深色/浅色主题切换 — **不做**（页面已是 Demo 深色，再加 toggle 容易把样式打穿）
- [x] Fuzz Test（64 runs）
- [x] Demo Slides（3 页 HTML）

---

## Phase ∞ · Roadmap（Demo 时嘴上讲，不实现）⬅ P2

- [ ] Chainlink CCTP / Kleros / Subnet / IPFS / 通知 / 多币种 / SaaS / 审计

---

## 快速状态检查

| Gate | 验收 | 状态 |
|------|------|------|
| Gate 1 | 合约部署 + ABI | ✅ |
| Gate 2 | Happy Path 链上跑通 | ✅（脚本）；浏览器 Core 待你点 |
| Gate 3 | Vercel + 兜底视频 | ❌ Vercel fetch failed；视频未录 |
| 提交 | GitHub public | ❌ 无 remote |

---

## 你还需要亲手做的（我做不了）

1. Core 导入 Buyer / Seller，两个浏览器 profile 连 http://localhost:3000
2. （可选）https://cloud.reown.com 拿 WalletConnect Project ID
3. 现场再走一遍 Create → Deposit → Submit → Approve（Project #0 已完成，请新建项目）
4. 录 `demo-backup.mp4` + 排练剧本
5. 建 GitHub remote 并 push；重试 Vercel

> Project `#0` 已 Completed。Demo 请再创建一个新项目，避免在已完成项目上卡住。
