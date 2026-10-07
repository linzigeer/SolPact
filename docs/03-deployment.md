# 03 · 部署与环境配置

> 历史原型参考文档：下文记录原有 EVM 实现。当前前端默认展示 Solana 迁移预览，旧前端模块位于 `web/legacy/evm/`；Solana 合约将另行重写。

> 目标：Full-Stack Dev 打开本文件，从零到"钱包能操作 Fuji 上的 Escrow" 20 分钟搞定。

## 1. 前置：钱包 & 领水

**默认钱包：Avalanche Core**（官方钱包）。RainbowKit 通过浏览器注入 / WalletConnect 连接 Core。MetaMask 只作备选，不是硬性要求。

### 1.1 准备 3 个测试钱包
- **Deployer**（部署合约用；私钥只放 `contracts/.env`，用 `forge script` 广播，**不需要**浏览器钱包签名）
- **Buyer**（Demo 用，导入 Core）
- **Seller**（Demo 用，导入 Core）

推荐用 Foundry 生成（已做过一次）：

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cast wallet new   # 重复 3 次：Deployer / Buyer / Seller
```

私钥写入 `contracts/.env`。**只用于 Fuji，不要往里充主网真钱。**

### 1.2 安装并配置 Core

1. 下载 [Core](https://core.app/)（Chrome 扩展或桌面端均可）
2. 创建 / 解锁钱包后：**Import existing wallet / Import private key**
3. 分别导入 **Buyer**、**Seller** 私钥（两个账号；Demo 用两个浏览器 profile，避免切账号卡壳）
4. 网络切到 **Avalanche Fuji C-Chain**（Core 原生列出，无需手填 RPC）

Fuji 参数（仅在钱包没自动加网络时需要）：

```
Network name:  Avalanche Fuji C-Chain
RPC URL:       https://api.avax-test.network/ext/bc/C/rpc
Chain ID:      43113
Symbol:        AVAX
Explorer:      https://testnet.snowtrace.io
```

### 1.3 领水（3 个地址各领一次）

优先用 Core 生态水龙头：

- Core 水龙头：<https://core.app/tools/testnet-faucet/>
- Avalanche 官方：<https://faucet.avax.network/>

**验证**：`https://testnet.snowtrace.io/address/<你的地址>` 能看到 AVAX 余额。Deployer 没 AVAX，部署交易会直接失败。

---

## 2. 合约部署（Foundry）

### 2.1 环境变量

在 `contracts/.env`：

```bash
DEPLOYER_PRIVATE_KEY=0x<Deployer 钱包私钥>
DEMO_BUYER=0x<Buyer 地址>
DEMO_SELLER=0x<Seller 地址>
SNOWTRACE_API_KEY=<https://snowtrace.io 免费注册后拿>
```

### 2.2 部署命令

```bash
cd contracts
source .env

forge script script/Deploy.s.sol \
  --rpc-url fuji \
  --broadcast \
  --verify \
  -vvvv
```

**期望输出**：

```
== Logs ==
  USDC: 0x1234...
  Escrow: 0xabcd...
```

**如果 `--verify` 失败**（Snowtrace API 有时抽风），可以先不 verify，Demo 不影响：

```bash
forge script script/Deploy.s.sol --rpc-url fuji --broadcast
```

事后再用 `forge verify-contract` 单独 verify。

### 2.3 手动验证一次端到端（cast 命令）

**目的**：不等前端做完，先用命令行确认合约在链上能正常工作。

```bash
# 变量
export ESCROW=0xabcd...
export USDC=0x1234...
export BUYER_PK=0x...
export SELLER_PK=0x...

# 1. Buyer approve USDC
cast send $USDC "approve(address,uint256)" $ESCROW 1000000000 \
  --rpc-url fuji --private-key $BUYER_PK

# 2. Buyer create project（1 个里程碑，1000 USDC，7 天 deadline）
# 用 cast 传数组比较麻烦，直接在 Foundry 里写个 script 更快，或跳过这步等前端做

# 3. 查看部署结果
cast call $ESCROW "nextProjectId()(uint256)" --rpc-url fuji
```

**关键检查**：
- `cast code $ESCROW --rpc-url fuji` 输出非空 → 合约存在
- `cast call $USDC "balanceOf(address)(uint256)" $DEMO_BUYER --rpc-url fuji` = 10000000000（1万 USDC）→ Mint 成功

### 2.4 把 ABI 交给前端

```bash
mkdir -p ../web/lib/abi
cat out/Escrow.sol/Escrow.json | jq '{abi}' > ../web/lib/abi/Escrow.json
cat out/MockUSDC.sol/MockUSDC.json | jq '{abi}' > ../web/lib/abi/MockUSDC.json
```

**如果没装 `jq`**：`brew install jq`。或者直接 `cp out/Escrow.sol/Escrow.json ../web/lib/abi/Escrow.json`，前端 `contracts.ts` 里再取 `.abi`。

---

## 3. WalletConnect Project ID

去 <https://cloud.reown.com>（原 WalletConnect Cloud）：

1. Sign up (GitHub 登录最快)
2. Create Project → 名字随便填
3. 复制 Project ID → 填到 `web/.env.local`

**注意**：不填的话 RainbowKit 会报 "Missing project ID"，钱包连接功能会挂。

---

## 4. 前端部署（Vercel）

### 4.1 本地先跑通

```bash
cd web
cp .env.local.example .env.local  # 编辑填入 3 个变量
pnpm dev
```

浏览器打开 `http://localhost:3000`，确认能连钱包、创建项目、看到项目详情。

### 4.2 部署到 Vercel（3 分钟）

```bash
pnpm add -g vercel
vercel login
vercel --prod
```

按提示选：
- Project name: `solpact`
- Framework: **Next.js**（自动识别）
- 环境变量：进 Vercel Dashboard → Settings → Environment Variables 手动加：

```
NEXT_PUBLIC_WC_PROJECT_ID=...
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
```

加完后 **必须 redeploy**（Vercel Dashboard → Deployments → 最新那次 → ⋯ → Redeploy）。

部署后的地址以 Vercel 输出为准，例如 `https://solpact-<hash>.vercel.app`；此处是命名示例。

---

## 5. 部署后 Smoke Test（Demo 前 30 分钟必做）

按顺序跑一遍，任何一步失败立即修：

- [ ] Landing 页能加载
- [ ] "Connect Wallet" 弹窗出现，能选 **Core** 并连到 Fuji C-Chain
- [ ] `/dashboard` 显示 "No projects yet"（因为是新钱包）
- [ ] `/project/new` 表单能填，点 Create 后 **Core 弹签名**
- [ ] 签名后 Snowtrace 上能看到交易
- [ ] `/dashboard` 3 秒内出现新项目
- [ ] 点进 `/project/[id]`，看到 Deposit 按钮
- [ ] 点 Deposit → approve USDC → 再签 deposit → 项目状态变 "Funded"
- [ ] 切换到 Seller（另一个浏览器 profile 里的 Core，已导入 Seller 私钥）
- [ ] Seller 视图能看到 Submit 按钮，提交 URI
- [ ] 切回 Buyer，Approve → **Seller 钱包 USDC 余额 +N**

任何一步 revert，先看 Snowtrace 上的 Failed 交易的 error 信息。

---

## 6. Demo 环境准备（关键）

### 6.1 两个浏览器窗口

- **窗口 A**：Chrome 主 profile，装 **Core**，导入 Buyer 私钥，网络 = Fuji C-Chain
- **窗口 B**：Chrome Guest 或另一个浏览器，装 **Core**，导入 Seller 私钥，网络 = Fuji C-Chain
- 各连接同一个 Vercel / localhost URL
- 不要在同一 Core 扩展里来回切账号——两个 profile 更稳

### 6.2 Snowtrace 页签

提前打开：
- `https://testnet.snowtrace.io/address/<Escrow 合约地址>#internaltx` （可看资金流）
- `https://testnet.snowtrace.io/address/<Escrow 合约地址>#events`（可看事件）

Demo 高光时刻切到这个页签，让评委看着交易实时上链。

### 6.3 兜底录屏

**Demo 前 30 分钟录一份完整流程视频**：

```bash
# macOS
Cmd+Shift+5 → 录制屏幕 → 3–5 分钟完整跑一遍
```

放到桌面命名 `demo-backup.mp4`。现场卡壳时 QuickTime 一键播。

---

## 7. 常见故障速查

| 症状 | 原因 | 修复 |
|-----|------|------|
| Vercel 上钱包连不上 | 环境变量没生效 | Redeploy |
| `insufficient funds for gas` | AVAX 不够 | 领水 |
| `execution reverted` 没 message | ABI 版本对不上 | 重新 `cp` ABI 到前端，重启 dev |
| `Chain not configured` | RainbowKit 只配了 Fuji，Core 停在主网或别的链 | Core 切到 **Avalanche Fuji C-Chain** |
| Approve 后 deposit 还是 revert | `SafeERC20: insufficient allowance` | 检查前端 approve 的 amount 是否等于 totalAmount |
| `getContractEvents` 慢或超时 | 主网块高太多；Fuji 上应该没事 | Demo 现场不会遇到；实在不行加 `fromBlock: <部署时的区块号>` |
| 事件订阅不刷新 | `useWatchContractEvent` 没配 `onLogs` | 检查回调是否调用 `refetch()` |

---

## 8. 时间盒对齐

| 时间点 | 应该完成的部署里程碑 |
|-------|-------------------|
| 14:30 | 合约在 Fuji 部署完，地址贴群 |
| 14:35 | ABI 交付到前端 |
| 15:30 | 前端本地 `pnpm dev` 跑通端到端 |
| 16:00 | Vercel 部署完，公网 URL 可访问 |
| 16:30 | 两个钱包跑通全流程 |
| 17:00 | 录完兜底视频 |
| 17:30 | 演练 Demo 剧本 |
