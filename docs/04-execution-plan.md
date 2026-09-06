# 04 · 执行计划（4.5 小时时间盒）

> 目标：13:00–17:30 的每一分钟都有明确产出，Demo 前有 30 分钟排练。

## 1. 时间轴总览（GANTT-STYLE）

```
时刻     Solidity Dev (A)          Frontend Dev (B)          Full-Stack / Demo (C)
─────    ─────────────────         ─────────────────         ─────────────────────
13:00 ┬─ 初始化 Foundry            初始化 Next.js             帮 A / B 排障 + 建 repo
      │  写 MockUSDC + Escrow      装依赖 + shadcn init      README.md 骨架
13:30 ┤  (状态机、events)          wagmi/providers            
      │  ↓                         Landing 页                 
14:00 ┤  写 test/Escrow.t.sol      /dashboard 骨架            
      │  跑测试全绿                (读事件那块可以 Mock)      
14:30 ┼─→ 部署到 Fuji ─────────── 拿地址 & ABI              开始集成
      │  📎 交付 ABI               填入 lib/contracts.ts     测试脚本跑一遍链上
15:00 ┤  编测试小 script (cast)    /project/new 创建流程     协助 B 调 wagmi 报错
      │                            /project/[id] 主页面      
15:30 ┤  文档化合约接口            MilestoneCard 组件         第一次端到端本地测试
      │  (README 里的 API 表)      事件订阅 auto-refresh     
16:00 ┼──────── 三人合流：本地 pnpm dev 端到端跑通 ────────
      │                                                       Vercel 部署
16:30 ┤  帮 C mint USDC 到 demo   打磨 UI (Landing 卖点)     公网 URL 端到端跑通
      │  地址、准备 Demo 数据                                  
17:00 ┼──────── 录兜底视频 ─────────
      │                                                       
17:15 ┤                             最后 UI 微调              Demo 剧本演练 × 3 次
      │                                                       
17:30 ─────────────────── 提交 GitHub + 项目介绍 ─────────────
```

---

## 2. 三个人各自的详细任务（可复制到 GitHub Issues）

### Person A — Solidity Dev

**必须完成（P0）**：
- [ ] 13:00 `mkdir contracts && forge init && forge install OpenZeppelin/openzeppelin-contracts@v5.0.2`
- [ ] 13:10 `foundry.toml` 配置 + remappings
- [ ] 13:20 复制 `MockUSDC.sol`（10 分钟）
- [ ] 13:30 复制 `Escrow.sol` 骨架，逐个填 create / deposit / submit / approve（60 分钟）
- [ ] 14:30 复制 `test/Escrow.t.sol`，跑 `forge test -vv` 全绿（20 分钟）
- [ ] 14:50 写 `script/Deploy.s.sol`，部署到 Fuji（10 分钟）
- [ ] 15:00 复制 ABI 到 `web/lib/abi/`（2 分钟）
- [ ] 15:05 在群里贴出：Escrow 地址 + USDC 地址 + Snowtrace 链接
- [ ] 15:10–16:00 补 dispute / autoRelease / refund 三条逃生舱（P1）
- [ ] 16:00 帮 C 用 `cast send` 给 Demo 钱包 mint USDC

**可以做（P1）**：
- [ ] Fuzz test（1–2 个 property test）
- [ ] Snowtrace verify（如果 `--verify` 失败，事后单独 verify）
- [ ] 补一个 `getMilestone(pid, idx)` 单条查询（gas 优化，前端目前用 `getMilestones` 全量拉也行）

**关键交付物**：
1. GitHub 上的 `contracts/` 目录
2. Fuji 部署地址（两个）
3. ABI JSON 文件

**卡壳时的止损**：
- 如果 14:30 test 没全绿：**砍 dispute 相关**，只保证 happy path + refund。dispute 在 Demo 里用"Roadmap"话术带过。
- 如果 15:00 还没部署：换用 `remix.ethereum.org` 直接在浏览器里部署，牺牲 verify。

---

### Person B — Frontend Dev

**必须完成（P0）**：
- [ ] 13:00 `create-next-app` + Tailwind + shadcn init（10 分钟）
- [ ] 13:15 装 wagmi / viem / rainbowkit / lucide-react（5 分钟）
- [ ] 13:20 `lib/wagmi.ts` + `providers.tsx` + `app/layout.tsx` 挂上（15 分钟）
- [ ] 13:35 `app/page.tsx` Landing（20 分钟）—— 有 ConnectButton + 3 个卖点卡片
- [ ] 13:55 `lib/format.ts` + `lib/contracts.ts`（用 Mock 地址先跑）（10 分钟）
- [ ] 14:05 `app/project/new/page.tsx` 表单（40 分钟）—— **暂时不 call 合约，只做 UI + 打印 args**
- [ ] 14:45 `app/project/[id]/page.tsx` 详情页骨架 + MilestoneCard（60 分钟）
- [ ] 15:45 换真合约地址，第一次调 `createProject` 交易
- [ ] 16:00 `app/dashboard/page.tsx` 项目列表（30 分钟）
- [ ] 16:30 事件订阅 auto-refresh（20 分钟）
- [ ] 16:50 UI 打磨（浅色配色、Loading 状态、Empty state）

**可以做（P1）**：
- [ ] 交易 hash 显示 + Snowtrace 跳转链接
- [ ] 里程碑 Deadline 倒计时
- [ ] Toast 错误信息优化

**关键交付物**：
1. `web/` 目录代码
2. Vercel 公网 URL

**卡壳时的止损**：
- 如果 15:00 前 wagmi 还连不上：**回退到 ethers.js v6 + window.ethereum**，2 小时肯定能搞出来
- 如果 16:00 事件订阅有问题：**改用轮询**，每 5 秒 `refetch()`
- 如果 Vercel 挂了：**用 `ngrok` 暴露本地端口** Demo（`ngrok http 3000`）

---

### Person C — Full-Stack / Demo Owner

**必须完成（P0）**：
- [ ] 13:00 建 GitHub repo，`git init`，push 空 README（10 分钟）
- [ ] 13:10 建两个子目录 `contracts/` 和 `web/`，push 初始状态（避免最后合并冲突）
- [ ] 13:20 领水 × 3 个地址 + Core 导入 Buyer/Seller 并切到 Fuji C-Chain
- [ ] 13:40 熟读 A 的合约 draft，准备好 `.env` 变量
- [ ] 14:00 帮 A 调 Foundry 问题（如果 A 没问题就写 README 项目介绍）
- [ ] 14:30 A 部署完后立刻用 `cast` 手动跑一次端到端（15 分钟）
- [ ] 15:00 帮 B 调 wagmi hooks 报错（wagmi v2 类型系统坑多）
- [ ] 15:30 集成测试：本地 `pnpm dev` 跑完整链条
- [ ] 16:00 Vercel 部署 + 环境变量 + Redeploy
- [ ] 16:30 公网 URL 端到端跑通
- [ ] 17:00 **录兜底视频**（3–5 分钟完整流程）
- [ ] 17:15 演练 Demo 剧本至少 3 遍

**可以做（P1）**：
- [ ] README.md 补上项目介绍、tech stack、部署方法
- [ ] 准备 Demo Slides（1 页痛点 + 1 页架构图 + 1 页 Roadmap，用 slides.new）
- [ ] 提前打开所有 Demo 页面标签

**关键交付物**：
1. GitHub repo URL
2. Vercel 部署 URL
3. Demo 兜底视频
4. Demo 剧本（见 `05-demo-day.md`）

---

## 3. 三个关键交接点（Handoff Gates）

### Gate 1 — 14:30 · 合约部署完成
**交付**：Escrow 地址、USDC 地址、ABI JSON

**A → B/C 说的话**：
> "Escrow 0x..., USDC 0x..., ABI 在 `web/lib/abi/`。已在 Fuji 上手动跑通 create + deposit + approve，Snowtrace 链接 [xxx]。"

**如果 Gate 1 晚点**：
- 15:00 还没交付 → B 用 Mock 合约地址继续调 UI；C 帮 A 补合约
- 15:30 还没交付 → **删掉 dispute/refund，只留 happy path**，简化后重新部署

---

### Gate 2 — 16:00 · 本地端到端跑通
**验收标准**：
- Buyer 钱包能 create → deposit
- Seller 钱包能 submit
- Buyer 钱包能 approve
- Seller 钱包 USDC 余额确实到账

**验收方式**：C 组织一次 15 分钟集体测试，三人围观同一屏幕。

**如果 Gate 2 没过**：
- 优先修 approve 那步（Demo 最高光）
- Dispute / Refund 不好使就砍掉，UI 隐藏对应按钮

---

### Gate 3 — 17:00 · 公网 Demo 环境 + 兜底视频
**验收标准**：
- Vercel URL 可访问
- 两个浏览器窗口两个钱包能同时操作
- 兜底视频存到桌面

---

## 4. 通信协议（避免瞎聊消耗时间）

- **一律用一个 Telegram/微信群**，别在 Discord + 群里分开发
- **每 30 分钟 status check**（15:00 / 15:30 / 16:00 / 16:30 / 17:00）：每人一句话说"正在做 X，估计还需 Y 分钟"
- **打断规则**：如果一个人卡壳超过 15 分钟，必须在群里 @ 求助
- **禁用**：远程 debug 别人的代码（浪费两个人时间）；除非 Gate 卡了

---

## 5. 砍功能决策树（如果时间不够）

```
                        ┌─→ Yes: 全套 + Chainlink Automation
                        │
       16:00 状态？────┼─→ Approve 主线跑通 + Refund 好使
                        │
                        └─→ 只有 approve 跑通: 砍 refund/dispute UI 按钮，
                            Demo 里只讲 happy path，把 refund/dispute
                            当成 "Roadmap 下一步" 讲
```

**永远不砍的**：
- Landing 页的 3 个卖点卡片（Demo 开场展示）
- Approve 到账那一下（Demo 高光）
- Snowtrace 链接（Demo 说服力来源）

**如果时间宽松**：
- 加 Chainlink Automation（super加分）
- 加 Snowtrace 交易列表在项目详情页
- 加深色/浅色主题切换（免费加分项）

---

## 6. 提交清单（17:30 前必须完成）

- [ ] GitHub repo 公开
- [ ] README.md 有：项目一句话 / 技术栈 / 部署地址 / 演示地址 / 团队成员
- [ ] Vercel URL 可访问
- [ ] 兜底视频存本地
- [ ] Demo 剧本打印或用 iPad 备着
- [ ] 三人钱包充满 AVAX + USDC
- [ ] 两个浏览器窗口预备好
- [ ] Snowtrace 页签预备好
- [ ] 手机拍一张组队合影发群（选做）

---

## 7. 补充：单人 / 双人版本（如果没凑齐 3 人）

### 双人（Full-Stack + 1 帮手）
- Full-Stack：合约 + 部署（13:00–15:00）→ 前端集成（15:00–17:00）
- 帮手：Landing + UI 组件 + Vercel（13:00–16:00）→ Demo 准备（16:00–17:30）
- 砍掉 dispute / refund UI，只保留 happy path

### 单人（狠人模式）
- 13:00–13:30：合约（直接抄本文档的代码）+ 部署
- 13:30–15:30：前端 4 页面（用 v0.dev 生成 UI 加速）
- 15:30–16:30：集成端到端
- 16:30–17:30：录视频 + Demo 演练

**单人不要碰**：事件订阅（用轮询）、dispute、Chainlink。
