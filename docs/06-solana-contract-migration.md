# SolPact Avalanche 合约迁移到 Solana 改写指导

建议采用 **Rust 与 Anchor 重写业务程序，使用 Project PDA 保存项目、Milestone PDA 保存里程碑，并为每个项目建立独立的 SPL USDC 金库**。保留创建、入金、交付、确认付款、超时领取、逾期退款和仲裁流程，同时修复原合约的未入金退款问题，明确截止时间及结算金额的含义。

适用范围是当前仓库的 `Escrow.sol`、`MockUSDC.sol` 及相关前端接入。本文给出目标设计和实现顺序；代码片段用于说明账户与校验方式，尚不是可直接部署的完整 Solana 程序。迁移首期在 Solana Devnet 新建项目，历史 Avalanche 项目单独保留，不导入正在托管的资金或状态。

## 1 分析基线和现有业务

分析日期为 2026 年 10 月 7 日，基线为合约改写前的工作区源码：当时仓库已经切换为 Solana 界面预览，尚无 Anchor 项目或真实钱包交易接入。后续实现和本地测试见 [Solana 合约工程](../solana/README.md)，账户与指令的最终细节以该工程为准。

| 现有文件 | 改写时的用途 |
| --- | --- |
| [Escrow.sol](../contracts/src/Escrow.sol) | 状态、角色、资金转移和时间条件的主要依据 |
| [MockUSDC.sol](../contracts/src/MockUSDC.sol) | 6 位小数测试代币，任何人均可 mint |
| [Escrow.t.sol](../contracts/test/Escrow.t.sol) | 已有 6 个普通测试和 2 个模糊测试 |
| [Deploy.s.sol](../contracts/script/Deploy.s.sol) | 旧合约部署与测试币分发 |
| [DemoHappyPath.s.sol](../contracts/script/DemoHappyPath.s.sol) | 创建、入金、交付、确认的演示流程 |
| [旧前端模块](../web/legacy/evm/) | EVM 调用、ABI、数字项目 ID 和事件查询的迁移参考 |
| [SolanaProjectPreview.tsx](../web/components/SolanaProjectPreview.tsx) | 当前样例页面，后续替换为真实账户数据 |

### 1.1 需要保留的业务语义

`Escrow.sol` 是标准 EVM 里程碑托管，没有 Avalanche 专用预编译、跨链消息或预言机依赖。核心改写工作集中在账户模型、代币调用和权限验证。

| 业务 | 当前源码行为 |
| --- | --- |
| 创建项目 | Buyer 指定 Seller、可选 Arbitrator、ERC20 地址和 1 至 20 个里程碑；不转账 |
| 初始约束 | Seller 非零且不等于 Buyer；每笔金额大于零；创建时 deadline 在未来；自动领取窗口为 1 小时至 90 天 |
| 入金 | Buyer 一次性支付全部 `totalAmount`，项目从 `Created` 变为 `Funded` |
| 提交交付 | Seller 将 `Pending` 改为 `Submitted`，记录 URI 和提交时间 |
| 确认交付 | Buyer 对 `Submitted` 里程碑付款，资金全部进入 Seller 钱包 |
| 超时领取 | Seller 在 `submittedAt + autoReleaseWindow` 到达后主动调用领取 |
| 逾期退款 | Buyer 对 deadline 已过、仍为 `Pending` 的里程碑申请全额退款 |
| 发起争议 | Buyer 或 Seller 对 `Submitted` 里程碑发起争议，项目必须配置仲裁员 |
| 仲裁 | Arbitrator 按 0 至 10,000 基点分配该里程碑金额，余数归 Buyer |
| 完成 | 所有里程碑金额均已处理，即 `releasedAmount == totalAmount` |

里程碑可以独立提交和结算，没有必须依序交付的约束。自动领取也没有定时任务：时间到达只使交易具备执行条件，Seller 仍需签名发送交易。

### 1.2 旧合约问题及目标处理

| 问题 | 源码位置与影响 | Solana 目标规则 |
| --- | --- | --- |
| **未入金退款可消耗其他项目余额** | `refundOnDeadlineMiss`，L176 起：未检查 `p.status == Funded`；所有项目共用 `address(this)` 的代币余额 | 所有已入金业务要求 `Funded`；每项目独立 vault；vault 与 Project 严格绑定 |
| 交付截止日没有限制提交 | `submitDelivery`，L140 起：只检查项目和里程碑状态；逾期 Seller 可抢在退款前提交 | 加入硬截止规则：`now <= deadline` 才可提交，`now > deadline` 才可退款 |
| 入金时可能已经过期 | `deposit`，L132 起：没有重新检查 deadline | 入金时要求 `now < min_deadline`，避免为已经过期的项目锁款 |
| `releasedAmount` 名称容易误导 | 退款和仲裁也累加该字段 | 改名 `settled_amount`，另存 Seller 实收和 Buyer 退款累计值 |
| 仲裁结果统一标记 Approved | `resolveDispute`，L217：即使 Seller 分成是 0 也标记 `Approved` | 仲裁终态使用 `Resolved`，保存双方实际结算金额 |
| Cancelled 只有枚举没有入口 | 无取消函数 | 新增仅适用于 `Draft` 或 `Created` 的取消；不允许单方取消已入金项目 |
| 仲裁员长期不处理会锁款 | `Disputed` 无其他退出路径，也没有超时机制 | 首期保留此规则并在产品中说明；仲裁超时和替换机制作为独立协议改动 |
| 任意 ERC20 都能传入 | 只排除零地址，未验证币种和转账语义 | 首期只允许部署配置指定的经典 SPL Token USDC mint |
| 字符串无长度限制 | description 和 URI 均为动态字符串 | description 上限 256 字节，URI 上限 256 字节；链下保存大文件 |

硬截止、入金时重新检查期限、独立仲裁终态和取消草稿，均是本次建议引入的规则变化。不要在移植过程中把这些变化隐藏为字段改名。

**未入金退款的本地复现：**项目 A 入金 1,000 USDC；另一 Buyer 创建同币种、金额 1,000 USDC 的项目 B，但不入金；B 的截止时间过去后，其 Buyer 调用退款，合约将 A 的资金转给 B 的 Buyer。A 仍显示 `Funded`，合约余额已变为零。这个问题不是重入问题，原有 `ReentrancyGuard` 不会阻止它。

本次执行 `cd contracts && forge test --offline -vv`，原有 8 个测试全部通过，两项模糊测试各运行 256 次。在临时隔离的 Foundry 副本中另执行 3 个行为复现测试，分别确认了上述退款问题、逾期提交阻止退款、零 Seller 分成仍标记 Approved。原测试中的 `testFuzz_CreateRejectsZeroOrPastDeadline` 实际将参数限制为正金额及未来时间，并未验证名字所称的拒绝分支。测试通过不能替代这些缺失的边界检查。

## 2 从 EVM 映射到 Solana

| EVM 实现 | Solana 实现 | 改写重点 |
| --- | --- | --- |
| 一个 Escrow 合约包含代码和 storage | 一个 Program 加多个数据账户 | Program 执行逻辑，账户持有状态；交易显式传入所需账户 |
| `mapping(projectId => Project)` | Project PDA | 地址通过确定的种子推导，读取时由 RPC 获取账户 |
| `mapping(projectId => Milestone[])` | 每个里程碑一个 Milestone PDA | 保存 Project 引用和 index，防止跨项目替换 |
| 全局 `nextProjectId` | Buyer 公钥加客户端生成的 16 字节项目 ID | 避免所有创建交易写同一个全局计数账户 |
| `address` | `Pubkey` | Base58 区分大小写，不使用 EVM 地址正则或 `toLowerCase()` |
| `msg.sender` 和 modifier | `Signer<'info>` 加角色公钥校验 | 传入某个公钥不代表其已授权 |
| `IERC20 token` | Mint 账户与固定 Token Program | 同时验证 mint、账户 program owner 和 token authority |
| `approve` 加 `transferFrom` | Buyer 签名的 `transfer_checked` CPI | 普通入金不需要预先授予 ERC20 allowance |
| Escrow 自身的 ERC20 余额 | Project PDA 控制的独立 Token Account | PDA 是转出授权者，Token Account 实际保存 USDC |
| `safeTransfer` | Token Program CPI | 金库转出使用 PDA seeds 签名 |
| `uint256` 金额 | `u64` 金额、`u128` 乘法中间值 | 处理转换和溢出；不能盲目缩窄类型 |
| `block.timestamp` | `Clock::get()?.unix_timestamp` | 使用链上秒级 `i64`，不用客户端时间决定权限 |
| `require` 和 revert | `require!`、`require_keys_eq!`、自定义错误 | 任何失败应使本次交易的状态和转账一起回滚 |
| view 方法 | 客户端解码账户 | 无需照搬 `getMilestones` 为链上遍历指令 |
| ABI 与 EVM logs | Anchor IDL、账户订阅、程序事件 | IDL 与部署版本绑定；事件不是唯一数据来源 |

PDA 没有私钥；本程序只有用对应 seeds 执行 CPI 时才能为它提供运行时签名。**Program ID、Project PDA、Mint 和 Vault Token Account 是四种不同地址。** 参见 [Solana PDA 文档](https://solana.com/docs/core/pda)。

## 3 目标账户模型

### 3.1 PDA 和金库推导规则

首期采用如下种子协议，并让 Rust 与 TypeScript 共用测试向量。

| 对象 | 地址推导 | 作用 |
| --- | --- | --- |
| Project PDA | 本程序下 `[b"project", buyer_pubkey, project_id_16_bytes]` | 项目状态，同时作为金库 token authority |
| Milestone PDA | 本程序下 `[b"milestone", project_pubkey, [index_u8]]` | index 为 0 至 19 的一个字节 |
| Vault ATA | `ATA(authority = Project PDA, mint, token_program)` | 每项目一个独立金库，记录地址到 `project.vault` |
| Buyer ATA | `ATA(buyer, mint, token_program)` | 入金来源和退款目的地 |
| Seller ATA | `ATA(seller, mint, token_program)` | 付款目的地 |

客户端用安全随机数生成 16 字节 `project_id`，提交前保存，重试时复用。不要把带连字符的 UUID 文本直接当成相同种子；SDK 统一使用原始字节。Project PDA 存在时禁止重新初始化；失败恢复先读状态，不生成第二个项目 ID 重复入金。

使用 `@solana/spl-token` 推导 Project PDA 的 ATA 时，需要允许 off-curve owner；该开关是为了接受 PDA，不是放宽链上 authority 校验。Buyer/Seller 的普通钱包 ATA 按常规方式推导。

Solana 账户的 **program owner** 与 SPL Token 结构中的 **owner/authority** 含义不同：Project 和 Milestone 由本程序拥有；Vault ATA 由 Token Program 拥有，但其转出 authority 是 Project PDA。ATA 地址由 authority、mint 和 Token Program 共同决定，创建 ATA 不要求接收方签名，可由交易发起者支付账户存储押金。参见 [Token Account 与 ATA 官方说明](https://solana.com/docs/tokens/basics/create-token-account)。

### 3.2 建议的数据结构

以下按 Anchor 普通账户序列化设计，不使用 zero-copy。省略业务错误、事件和各指令实现。

```rust
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy,
         PartialEq, Eq, InitSpace)]
pub enum ProjectStatus {
    Draft, Created, Funded, Completed, Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy,
         PartialEq, Eq, InitSpace)]
pub enum MilestoneStatus {
    Pending, Submitted, Approved, Disputed, Refunded, Resolved,
}

#[account]
#[derive(InitSpace)]
pub struct Project {
    pub version: u8,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub arbitrator: Option<Pubkey>,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub project_id: [u8; 16],
    pub expected_milestones: u8,
    pub milestone_count: u8,
    pub settled_count: u8,
    pub total_amount: u64,
    pub settled_amount: u64,
    pub seller_paid_amount: u64,
    pub buyer_refunded_amount: u64,
    pub created_at: i64,
    pub min_deadline: i64,
    pub auto_release_window: i64,
    pub status: ProjectStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Milestone {
    pub version: u8,
    pub project: Pubkey,
    pub index: u8,
    pub amount: u64,
    pub deadline: i64,
    pub submitted_at: i64, // Pending 时为 0
    pub seller_paid: u64,
    pub buyer_refunded: u64,
    pub status: MilestoneStatus,
    pub bump: u8,
    #[max_len(256)]
    pub description: String,
    #[max_len(256)]
    pub deliverable_uri: String,
}
```

使用默认 8 字节 discriminator 时，上述 Project 最大分配空间为 **247 字节**，Milestone 为 **604 字节**。初始化分别采用 `space = 8 + Project::INIT_SPACE` 和 `space = 8 + Milestone::INIT_SPACE`。`Option<Pubkey>` 按最大 33 字节预留，字符串包含 4 字节长度前缀；未来加字段必须重算并升级 schema。参见 [Anchor 账户空间规则](https://www.anchor-lang.com/docs/references/space)。

`#[max_len]` 只帮助计算空间，不能代替 handler 的长度检查。使用 `description.as_bytes().len() <= 256` 和同样的 URI 检查；中文字符可能占多个字节。交付 URI 必须非空，大文件放在链下；若需要不可变证据，应使用内容寻址 URI 或另存摘要，普通 HTTPS URL 只记录位置，无法保证内容不变。

`arbitrator = None` 明确表示不启用仲裁。Seller 不得为默认公钥或 Buyer；若设置 Arbitrator，首期建议要求其非默认公钥且不同于买卖双方，作为相对旧版的新约束。该检查不等于仲裁员已接受委托；首期仍沿用创建时指定仲裁员的信任模型。是否需要 Seller 或 Arbitrator 接单签名，应作为后续独立功能。

### 3.3 为什么不把全部里程碑直接放进一个账户

一个 Project 内嵌 `Vec<Milestone>` 可以减少账户和租金，但长文本会让单账户扩大，且创建参数可能无法装入交易。按本方案每个里程碑预留 512 字节文本，20 个条目仅文本就有 10,240 字节。

本方案按常用 legacy/v0 交易的 **1,232 字节**大小预算做分批处理；钱包、SDK、目标集群若采用其他交易格式，另行验证其限制。不要假定引入 Address Lookup Table 就能解决长文本问题，它主要压缩账户地址引用，不压缩 description/URI。参见 [Solana 交易大小与原子性](https://solana.com/docs/core/transactions)。Anchor 基于 CPI 的普通 `init` 还存在 10,240 字节初始分配限制，这不是账户总容量上限；使用小型独立账户可以避开首期的大账户分配复杂度。参见 [Anchor 账户初始化限制](https://www.anchor-lang.com/docs/features/zero-copy)。

推荐分成 `create_project`、若干 `add_milestone`、`finalize_project`。交易内仍保持原子性，跨交易的草稿流程则允许中断和继续。不同项目有独立写账户；同一项目的多笔结算都更新 Project 和 Vault，会串行执行，不应宣称拆分 Milestone 后同项目付款可完全并行。

## 4 指令设计和状态转换

### 4.1 创建和冻结项目条款

| 指令 | 签名者及主要账户 | 前置条件 | 结果 |
| --- | --- | --- | --- |
| `create_project` | Buyer；新 Project、Mint、Vault ATA、System/Token/ATA Program | 项目 ID 未使用；1 至 20 个预期里程碑；合法角色、mint、窗口 | 建立 `Draft`；累计金额及计数清零；Buyer 支付创建押金 |
| `add_milestone` | Buyer；Project、新 Milestone、System Program | `Draft`；index 等于当前 count 且小于 expected；金额大于零；deadline 在未来；文本不过长 | 创建唯一条目，checked 累加 total/count，更新最早 deadline |
| `finalize_project` | Buyer；Project | `Draft`；count 等于 expected；total 大于零；`now < min_deadline` | 变为 `Created`，冻结角色、mint、金额、截止日和窗口 |
| `cancel_project` | Buyer；Project | 仅 `Draft` 或 `Created`，尚未发生协议入金 | 变为 `Cancelled`，不触发里程碑付款 |

初始化 `min_deadline = i64::MAX`，每次增加里程碑取最小值。只允许顺序追加且使用 `init`，因此 finalize 可以依赖经过校验的 count、total 和 min，不必一次传入全部 20 个 Milestone。首期不提供条款修改；草稿填写错误时取消并重新创建。

Vault 可提前被他人创建为合法 ATA，客户端应先发送幂等 ATA 创建指令，再调用程序初始化并校验它。这样不会因为合法 ATA 已存在而阻止项目创建。任何直接转入 Vault 的余额都不构成协议入金，只有成功的 `deposit` 能将项目设为 `Funded`。

小项目可以将多条创建指令放入一个交易，但必须先实测序列化大小和模拟执行。大项目按序确认并显示草稿进度；余额和正式待执行项目列表应排除草稿。

### 4.2 原 Solidity 方法与新指令对应

下表中的状态前提由链上程序执行。交付、争议及所有付款或退款指令均要求 Project 为 `Funded`；创建、入金和取消分别遵守自己的状态前提，不能仅依靠前端禁用按钮。

| Solidity 方法 | Solana 指令与签名者 | 校验及转账 | 里程碑结果 |
| --- | --- | --- | --- |
| `createProject` | 上述三阶段创建，Buyer | 分批写入，finalize 冻结条款 | `Pending` |
| `deposit` | `deposit`，Buyer | Project 为 `Created`；`now < min_deadline`；Buyer ATA 向 Vault 转 `total_amount` | Project 变为 `Funded` |
| `submitDelivery` | `submit_delivery`，Seller | `Pending`；`now <= deadline`；非空且不过长的 URI；记录链上时间 | `Submitted` |
| `approveMilestone` | `approve_milestone`，Buyer | `Submitted`；Vault 向 Seller ATA 转该里程碑全额 | `Approved` |
| `claimAutoRelease` | `claim_auto_release`，Seller | `Submitted`；`now >= submitted_at + auto_release_window`；同样付款 | `Approved` |
| `refundOnDeadlineMiss` | `refund_on_deadline_miss`，Buyer | `Pending`；`now > deadline`；Vault 向 Buyer ATA 转全额 | `Refunded` |
| `raiseDispute` | `raise_dispute`，Buyer 或 Seller | `Submitted`；存在仲裁员；不转账 | `Disputed` |
| `resolveDispute` | `resolve_dispute`，指定 Arbitrator | `Disputed`；分成 0 至 10,000；向双方 ATA 分别转账 | `Resolved` |
| `_releaseToSeller` | 内部结算辅助函数 | 共用金额、状态、金库和终态校验 | 不单独暴露指令 |
| `_tryComplete` | 内部完成条件 | settled count 与金额同时达到 total | Project 变为 `Completed` |
| `getMilestones` | SDK 批量读取 Milestone PDA | 根据 Project count 推导账户，按 index 排序 | 不发交易 |
| `getMilestoneCount` / `projects` | SDK 读取 Project | 从账户字段获取 | 不发交易 |

`Approved`、`Refunded`、`Resolved` 均为不可再次结算的终态。`Disputed` 只能走仲裁，Buyer 确认、Seller 超时领取和 deadline 退款都必须失败。全额退款结束的项目也属于 `Completed`，含义是“全部资金已处理”，不表示全部服务获认可。

建议冻结如下指令参数接口；下列是接口草案，省略每个方法的 Anchor `Context` 和 `Result<()>`：

```text
create_project(project_id: [u8; 16], seller: Pubkey,
               arbitrator: Option<Pubkey>, expected_milestones: u8,
               auto_release_window: i64)
add_milestone(index: u8, amount: u64, deadline: i64, description: String)
finalize_project()
cancel_project()
deposit()
submit_delivery(uri: String)
approve_milestone()
claim_auto_release()
refund_on_deadline_miss()
raise_dispute()
resolve_dispute(seller_share_bps: u16)
```

Mint、Project、Milestone 和收付款账户通过 `Context` 传入并校验。除创建里程碑外，结算金额始终从链上条目读取；操作哪个项目和里程碑由经校验的账户确定，无需再接受可产生歧义的客户端金额或全局项目 ID。

### 4.3 时间边界和竞争条件

自动领取窗口保留 `3_600 <= window <= 7_776_000` 秒。计算解锁时间使用 `checked_add`，不将 `i64` 时间直接无检查地转换为 `u64`。

| 边界 | 规则 |
| --- | --- |
| `now == deadline` | Seller 仍可提交；Buyer 尚不可逾期退款 |
| `now > deadline` 且仍为 Pending | 拒绝提交；Buyer 可退款 |
| 截止日前已提交、现在 deadline 已过 | 仍走确认、争议或超时领取；不能当成未交付退款 |
| `now == submitted_at + window` | Seller 可领取 |
| 已超过自动领取时间但仍为 Submitted | 保留旧版规则：双方仍可发起争议；先成功执行的争议或领取决定后续状态 |
| 已为 Disputed | 即使自动领取时间已到也不能领取 |

上述竞争由账户写锁和执行时状态检查解决；客户端读到的可操作状态不保证交易到达时仍然有效。如果产品希望争议只能在验收窗口内发起，应显式加入 `now < unlock_at` 并调整测试，这属于新的业务规则。

## 5 代币转移和权限实现

### 5.1 MockUSDC 改成测试 Mint

不需要将 `MockUSDC.sol` 重写为另一个代币程序。使用标准 SPL Token Program 创建 6 位小数的测试 Mint，通过测试脚本掌握的 mint authority 分发代币。托管 Program 只处理转账，不提供任意人增发真实 USDC 的入口。

| 环境 | Mint 选择 |
| --- | --- |
| localnet 与单元测试 | 测试夹具创建的 6 位小数 SPL Mint |
| Devnet 演示 | 自建测试 Mint 或 Circle Devnet USDC，选定后固定到该部署 |
| Mainnet | Circle 官方 USDC Mint，并校验其 Token Program 与 decimals |

Circle 当前列出的 Solana Mainnet USDC 是 `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`，Devnet USDC 是 `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`。部署时再次对照 [Circle 官方地址表](https://developers.circle.com/stablecoins/usdc-contract-addresses) 和目标集群的 Mint 账户；不能仅凭名称或 `decimals == 6` 认定币种。

首期将支持的 Mint 固定为每个部署的 `SUPPORTED_MINT`，`create_project` 用 `address` 约束校验，后续指令绑定 `project.mint`。本地测试部署使用测试 Mint 的配置；发布清单记录实际 Mint，禁止只在前端设置白名单。以后若增加链上 Config，必须明确管理员初始化权限，防止任何人抢先写入配置。

采用 `anchor_spl::token::{Token, Mint, TokenAccount, TransferChecked}` 和 `Program<'info, Token>`，首期拒绝 Token-2022。若未来开放带 transfer fee、transfer hook 或其他扩展的代币，需重新设计到账计量和 CPI 安全性，不能只换成 `TokenInterface` 就宣称支持所有扩展。

### 5.2 入金账户与转出账户

入金需要 Buyer 签名、只读 Mint、可写 Project、Buyer ATA 和 Vault，以及固定 Token Program。校验 Buyer 身份、来源 ATA authority/mint、Vault authority/mint/address 和 Project 状态；通过 `transfer_checked(total_amount, 6)` 完成入金，再进入 `Funded`。失败时不得留下已入金状态。

转出时，业务调用者提供 Buyer、Seller 或 Arbitrator 的角色签名；实际金库转账 authority 始终是 Project PDA。收款账户从项目中保存的买卖双方推导，不接受调用者随意指定的收款人。

下面是 **Buyer 确认付款** 的账户约束示例。接收方 ATA 在交易前序指令中幂等创建，因此这里不使用 `init_if_needed`。`PactError`、handler 和事件需要在实际程序中补齐。

```rust
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

#[derive(Accounts)]
pub struct ApproveMilestone<'info> {
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"project", project.buyer.as_ref(), project.project_id.as_ref()],
        bump = project.bump,
        has_one = buyer,
        has_one = mint,
        has_one = vault,
        constraint = project.status == ProjectStatus::Funded @ PactError::NotFunded
    )]
    pub project: Account<'info, Project>,
    #[account(
        mut,
        seeds = [b"milestone", project.key().as_ref(), &[milestone.index]],
        bump = milestone.bump,
        has_one = project,
        constraint = milestone.index < project.milestone_count @ PactError::InvalidIndex,
        constraint = milestone.status == MilestoneStatus::Submitted @ PactError::NotSubmitted
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(constraint = mint.decimals == 6 @ PactError::InvalidMint)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = project,
        associated_token::token_program = token_program
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        constraint = seller_ata.owner == project.seller @ PactError::InvalidRecipient,
        constraint = seller_ata.key() ==
            anchor_spl::associated_token::get_associated_token_address(
                &project.seller, &mint.key()
            ) @ PactError::InvalidRecipient
    )]
    pub seller_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
```

这里 `has_one = buyer` 验证的是公钥相等，`Signer` 验证的是授权，两者都需要。Milestone 同时检查 PDA 和父 Project；Vault 同时检查记录的地址和 ATA 关系。仲裁指令使用 `project.arbitrator == Some(arbitrator.key())` 和 `Signer` 校验，不能对 `Option<Pubkey>` 机械套用 `has_one`。参见 [Anchor 账户约束](https://www.anchor-lang.com/docs/references/account-constraints)。

完成状态与金额预校验后，付款 CPI 的关键片段如下；`amount` 来自里程碑，不接受客户端任意传入。

```rust
let buyer_key = ctx.accounts.project.buyer;
let project_id = ctx.accounts.project.project_id;
let bump_seed = [ctx.accounts.project.bump];
let project_seeds: &[&[u8]] = &[
    b"project", buyer_key.as_ref(), project_id.as_ref(), &bump_seed,
];
let signer_seeds = &[project_seeds];
let amount = ctx.accounts.milestone.amount;

token::transfer_checked(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.seller_ata.to_account_info(),
            authority: ctx.accounts.project.to_account_info(),
        },
        signer_seeds,
    ),
    amount,
    ctx.accounts.mint.decimals,
)?;
```

随后将 milestone 设为 `Approved`，记录实付金额，更新项目累计值及完成状态。CPI 失败必须用 `?` 向上传播；若后续检查失败也会整体回滚。需要读取 CPI 后的 token 余额时先 `reload()`，不要读 Anchor 反序列化缓存中的旧值。参见 [Anchor Token 转账和 PDA 签名](https://www.anchor-lang.com/docs/tokens/basics/transfer-tokens)。

不要机械移植 Solidity 的 `ReentrancyGuard`。首期将外部调用限定为固定 Token/ATA/System Program，以明确状态转换、受约束账户和交易原子性保护资金；未来增加外部 hook 或其他 CPI 时重新评估调用路径。

### 5.3 仲裁分账和金额守恒

金额统一为最小单位：`1 USDC = 1_000_000`。Rust 入参和账户金额为 `u64`；TypeScript 使用 `bigint` 或与 SDK 匹配的 BN。用户输入先按字符串解析，拒绝负数、超过 6 位小数和超过 `u64` 的值，不能通过浮点乘法生成转账金额。

仲裁沿用旧版向下取整的 Seller 分成，余数归 Buyer：

```rust
require!(seller_share_bps <= 10_000, PactError::InvalidBps);
let seller_payout = u64::try_from(
    (u128::from(amount) * u128::from(seller_share_bps)) / 10_000u128
).map_err(|_| error!(PactError::MathOverflow))?;
let buyer_refund = amount.checked_sub(seller_payout)
    .ok_or_else(|| error!(PactError::MathOverflow))?;
```

`seller_share_bps` 使用 `u16`。0 分成仍可仲裁，零金额的那笔 CPI 可跳过；两笔非零转账与所有状态更新必须在同一指令中完成。第二笔转账失败时，第一笔和状态更新一并回滚。

每个结算入口统一执行以下不变量，所有累加使用 `checked_add`：

```text
settled_amount = seller_paid_amount + buyer_refunded_amount
0 <= settled_amount <= total_amount
每个终态里程碑：seller_paid + buyer_refunded = amount
每个非终态里程碑：seller_paid = buyer_refunded = 0
settled_count = 已进入终态的里程碑数量
Funded 项目的协议未结算金额 = total_amount - settled_amount
Completed 条件：settled_count == milestone_count 且 settled_amount == total_amount
```

Vault 的实际余额应大于或等于未结算金额。任意人都可能直接向 Vault 转币，所以不能要求其余额始终严格相等，更不能在项目完成时把整个 Vault 余额无条件转给最后一个收款人。正式入金仍须由 Buyer 支付完整 `total_amount`，不把外部赠送余额折算成已入金。

退款、确认、自动领取和仲裁共用结算辅助函数，避免某一路径忘记更新金额或完成状态。没有结算权的通用 `withdraw` 指令、管理员任意提款或可替换收款人的入口都不属于首期设计。

### 5.4 租金押金与账户关闭

USDC 结算和 SOL 手续费、账户存储押金分别计算。Project、Milestone、Vault 的初始化押金由 Buyer 承担；缺失的接收方 ATA 可由当前操作发起者通过前序幂等创建指令支付，不要求接收方在线。仲裁员因此只需自己的签名及必要 SOL，不需 Buyer/Seller 配合签名。

首期保留 Project、Milestone 和 Vault，不开放关闭或盈余提取指令，便于历史查询，也避免关闭后复用项目 ID。代价是押金及误转余额暂不回收，应在产品成本说明中体现。

后续若实现关闭，需单独设计：所有结算完成或未入金取消、无争议和负债、先按明确规则处理多余代币、空 Vault 才能关闭、lamports 退还创建出资方，并保留不可重建标记或永久项目记录。取消项目不自动等同于可以无条件清空金库。

## 6 安全边界和错误接口

首期实现评审至少覆盖以下独立边界。

| 边界 | 必须执行的检查 |
| --- | --- |
| 身份 | Buyer/Seller/Arbitrator 的 Signer 及项目内角色匹配；普通 fee payer 不自动取得业务权限 |
| 数据账户 | 正确 Program owner、Anchor 类型 discriminator、版本、canonical PDA seeds 和 bump |
| 父子关系 | milestone.project 匹配；index 在范围内；不能拿 A 的里程碑给 B 结算 |
| 金库 | vault 地址、mint、token authority 与 Project 绑定；不能拿另一个项目或调用者的 Token Account 替代 |
| 收款方 | 双方 ATA 与项目内角色绑定，mint 一致；禁止 source 与 destination 意外别名 |
| 外部程序 | 固定经典 Token Program；创建 ATA 时固定 Associated Token Program；不接收任意 CPI program |
| 初始化 | Project/Milestone 使用 `init`；拒绝重复 ID、重复 index 和缺项 finalize；不把 `init_if_needed` 用于重置业务状态 |
| 终态 | Completed/Cancelled 不可再次入金；单个已结算里程碑不可重付；Disputed 不可自动领取 |
| 数值 | 非零金额、checked 累加、u128 分账、秒级时间及边界、UTF-8 字节限制 |
| 交易失败 | ATA 创建、任意 CPI 或金额更新失败均不留下部分结算 |

对多个可写账户显式验证应有的相异关系，不依赖某个 Anchor 版本可能提供的重复账户默认行为。`remaining_accounts` 不用于接收未经验证的里程碑或收款账户。

建议稳定导出以下错误码：`Unauthorized`、`InvalidMint`、`InvalidRecipient`、`InvalidVault`、`InvalidProjectState`、`InvalidMilestoneState`、`NotFunded`、`NotSubmitted`、`InvalidIndex`、`TooEarly`、`DeadlinePassed`、`NotOverdue`、`NoArbitrator`、`InvalidBps`、`TextTooLong`、`MathOverflow`。通过 IDL 给前端映射可理解的提示。

真实 USDC 由发行方控制相关代币权限，账户被冻结时 CPI 可能失败；托管程序应原子回滚并保留待结算状态。程序升级权限也不同于某项目的仲裁权限：持有升级权限的人可替换业务代码，上线前需明确权限保管方式和用户信任边界。

## 7 前端和查询层如何接入

当前默认前端没有真实 Solana 交易入口。保留 `web/legacy/evm/`，新增 Solana 客户端层，不直接将 EVM ABI 调用参数替换成公钥。

| 现有部分 | 接入改动 |
| --- | --- |
| [providers.tsx](../web/providers.tsx)、[WalletButton.tsx](../web/components/WalletButton.tsx) | 增加 Solana 连接和钱包 Provider，提供可签名的钱包适配 |
| [network.ts](../web/lib/network.ts) | 明确 cluster、RPC、Program ID、Mint 和部署版本；分别维护 localnet/Devnet/Mainnet |
| [项目创建页](../web/app/project/new/page.tsx) | 真实公钥和金额校验；持久化 project_id；编排创建、追加、finalize 和入金 |
| [项目详情页](../web/app/project/[id]/page.tsx) | 路由使用 Project PDA Base58；读取 Project 与所有 Milestone；按角色提供指令 |
| [Dashboard](../web/app/dashboard/page.tsx) | 按 Buyer/Seller 过滤程序账户或查询索引服务，替换从区块 0 扫 EVM 日志的方式 |
| [SettlementProgress.tsx](../web/components/SettlementProgress.tsx) | 将“已结算”“卖方实收”“已退款”分开；草稿/待入金不展示为已托管余额 |
| [ProjectStatusBadge.tsx](../web/components/ProjectStatusBadge.tsx) | 使用明确状态映射；旧数字 0/1/2 与新增 Draft 后的枚举序号不再兼容 |
| [format.ts](../web/lib/format.ts) | 解耦金额解析与 viem；业务计算保持整数；地址使用 PublicKey 比较 |
| `web/lib/abi/` | 为 Solana 新建 IDL 与生成的 TS 类型目录，版本随程序发布 |

按本文固定布局，默认 8 字节 discriminator 后是 1 字节 version，因此 Project 的 Buyer 公钥从 offset 9 开始，Seller 从 offset 41 开始。可以分别使用 `getProgramAccounts` 的类型与 memcmp 过滤，再按 Project PDA 去重；schema 改动后必须同步过滤偏移。不要对全网账户无条件调用 `.all()` 后在浏览器过滤海量结果。

事件可保留 `ProjectCreated`、`Deposited`、`DeliverySubmitted`、`MilestoneApproved`、`DisputeRaised`、`DisputeResolved`、`AutoReleased`、`Refunded` 的业务含义，新增草稿、取消、完成事件。`ProjectCreated` 建议在 finalize 发出，包含稳定的 Project PDA；结算事件记录 index、双方金额和原因，避免消费者从名称推断到账情况。旧自动领取同时发出 Approved 和 AutoReleased，新索引若保留双事件，不可将它们计为两笔付款。

账户是当前状态的依据；事件服务用于历史检索和通知。Anchor `emit!` 的日志可能被数据服务截断，因此要支持账户重读、历史补抓及按交易签名和事件序号去重。参见 [Anchor 事件文档](https://www.anchor-lang.com/docs/features/events)。

交易流程统一为：构建必要的 ATA 指令及业务指令、模拟、钱包签名、发送、等待确认、检查交易错误、重读账户。保存 blockhash 与 `lastValidBlockHeight`，处理过期重签；收到交易签名不等于业务已完成。自动领取通知服务只能提醒 Seller，首期不能替 Seller 签名。若以后开放任何人代触发，必须新增明确规则并把收款 ATA 固定为 Seller。

## 8 工程组织与工具链

建议保留现有 `contracts/` 作为 EVM 参考，新增独立 Anchor 工作区。下列路径是待实现目录。

```text
solana/
  Anchor.toml
  Cargo.toml
  Cargo.lock
  programs/solpact/src/
    lib.rs
    constants.rs
    errors.rs
    events.rs
    state/project.rs
    state/milestone.rs
    instructions/
    settlement.rs
  tests/
    lifecycle.ts
    authorization.ts
    deadlines.ts
    disputes.ts
    isolation.ts
  scripts/
    setup-mint.ts
    demo-happy-path.ts
web/lib/solana/
  program.ts
  pdas.ts
  amounts.ts
  instructions.ts
  queries.ts
  idl/
```

当前环境检测到 `anchor-cli 0.31.1` 和 `solana-cli 2.1.0`。可将 Anchor 0.31.1 作为初始实现基线，统一 CLI、`anchor-lang`、`anchor-spl` 与 `@coral-xyz/anchor` 的精确版本，固定依赖锁文件。现有环境有 CLI 不代表 Rust/SBF 构建与集成测试已经通过，须在第一阶段建立可复现构建。

Anchor 0.31.1 的 [发布说明](https://www.anchor-lang.com/docs/updates/release-notes/0-31-1) 可作为该基线的版本参考。在线 Anchor 文档可能已使用不同包名或 API；本文代码按 0.31.x 的常见接口组织。前端选兼容的 `@solana/web3.js` v1、`@solana/spl-token` 和钱包适配库，不混用另一代 SDK 的对象类型；升级整个栈时再一起调整。参见 [Anchor TypeScript 兼容说明](https://www.anchor-lang.com/docs/clients/typescript)。

Program ID 必须在程序声明、`Anchor.toml`、部署产物、IDL 和前端配置中保持一致。交易确认使用同一 cluster；Devnet 上的程序地址不能因为 Base58 格式合法就被视为 Mainnet 已部署。

## 9 测试迁移和验收标准

### 9.1 移植原有测试

| 原测试 | Solana 对应断言 |
| --- | --- |
| `test_HappyPath_CreateDepositSubmitApprove` | 完整创建后入金、提交、确认；Vault 减少、Seller ATA 增加、状态及计数完成 |
| `test_RefundOnDeadlineMiss` | 链上时间越过 deadline 后退款到 Buyer ATA；累计退款和 settled 正确 |
| `test_ClaimAutoRelease_TooEarly_Reverts` | 解锁时间前 1 秒失败，余额和状态不变 |
| `test_ClaimAutoRelease_AfterWindow_Succeeds` | 精确到达解锁时刻和之后均可领取 |
| `test_DisputeResolve_SplitFunds` | 1,000 USDC 按 7,000 bps 得到 Seller 700、Buyer 300，终态为 Resolved |
| `test_OnlyBuyerCanApprove` | Seller、无关签名者、只有 Buyer 公钥但缺少授权均不能批准 |
| 创建模糊测试 | 生成有效数据验证 total；另测零金额、过期、数量越界及总金额溢出 |
| 支付模糊测试 | 随机金额与分成下，实际余额变化和账户账本严格一致 |

时间测试用可控制 Clock 的本地测试环境，例如 LiteSVM，或所选测试框架的等价能力；只推进 slot 不保证 Unix 时间按预期改变，测试必须验证实际 Clock。不要为 Devnet 演示把生产的 1 小时窗口校验改成数秒。

### 9.2 首期必须新增的测试

| 类别 | 必须覆盖的场景 |
| --- | --- |
| 跨项目资金隔离 | A 已入金、B 未入金；B 退款失败；换入 A 的 Vault/Milestone 也失败；A 余额完整 |
| 伪造账户 | 错 Mint、错 Token Program、错 PDA/bump、错 program owner、错父项目、错收款 ATA、重复可写账户 |
| 创建恢复 | 重复 ID、重复/越界 index、少加条目 finalize、20 个条目、分批中断恢复、已取消草稿再操作 |
| 长度和交易预算 | 中文多字节文本、256/257 字节、空 URI；最大长度单条创建/交付和分批交易均可序列化及模拟 |
| 付款单次性 | 重复 deposit、approve、refund、claim、resolve 均失败；最后一笔只结算一次 |
| 时间边界 | deadline 前/等于/后；unlock 前/等于/后；入金前已有里程碑过期；逾期提交与退款竞争 |
| 争议锁定 | 无仲裁员、第三方争议、错误仲裁员；Disputed 下确认、退款和自动领取全部失败 |
| 仲裁算术 | bps 为 0、1、9,999、10,000、10,001；极小金额的舍入；大额 u64 金额的 u128 中间计算 |
| 混合结果 | 同一项目分别正常付款、退款、仲裁，任意结算顺序都满足总金额与计数不变量 |
| CPI 原子性 | 余额不足或接收方账户冻结导致失败；仲裁第二笔转账失败时第一笔与全部状态回滚 |
| 外部转入 | 预先创建合法 Vault ATA；向 Vault 直接赠币；不误判为 Funded；不阻止正常入金和按账本完成 |
| SDK 一致性 | Rust/TS 的 PDA 字节种子、枚举映射、UTF-8 长度、BN/bigint 和精度边界一致 |

### 9.3 Devnet 完成标准

- Buyer/Seller/Arbitrator 使用不同钱包，完成正常付款、逾期退款、超时领取和两种仲裁分账路径。
- 对每条路径核对 Project、Milestone、Vault 和双方 ATA 的状态及余额；不能只检查事件或 toast。
- 前端展示真实 Program ID、Mint、交易签名和带 Devnet 标识的浏览器链接，交易确认后更新数据。
- RPC 中断、用户拒签、blockhash 过期、ATA 已存在时能够恢复；重试不创建重复项目、不重复入金。
- 测试报告区分 localnet 时间推进测试和真实 Devnet 交易，记录实际部署产物与对应 IDL。

## 10 实施顺序和历史项目处理

| 阶段 | 交付物 | 进入下一阶段的条件 |
| --- | --- | --- |
| 1 固定协议 | PDA、schema、状态表、长度限制、Mint、时间规则、SDK 版本 | 按本文默认规则形成实现常量和可复现构建 |
| 2 完成主流程 | 创建草稿、追加、finalize、deposit、submit、approve | 本地全流程通过；未入金退款与跨项目替换被拒绝 |
| 3 完成全部结算 | refund、auto release、dispute、resolve、cancel 和共用账本 | 边界、权限、混合结算、舍入、CPI 回滚测试通过 |
| 4 接入客户端 | IDL、钱包、PDA SDK、真实查询、确认与错误处理 | 双钱包浏览器主流程完成，可恢复分批创建 |
| 5 发布 Devnet | 固定 Program ID/Mint、部署记录、四类结算演示脚本 | 第 9 节验收全部完成，移除默认样例交易状态 |
| 6 准备 Mainnet | 安全评审、升级权限安排、监控和发布流程 | 资金及权限问题处理完毕，真实 USDC 配置核对 |

首期推荐**新项目直接在 Solana 创建，旧项目保留为带链标识的历史记录**。部署一个 Solana Program 不会迁移 Avalanche storage、钱包身份、代币或未完成合同。

若已有真实在途资金，切换前必须逐项目核对旧链余额、实际释放、退款和争议状态；仓库里的演示成功记录不代表旧合约当前资金已经全部结清。原合约没有统一暂停、管理员退款或资金迁移入口，不能设计成“管理员一键把所有余额搬到 Solana”。上文发现的退款问题也意味着不能继续把旧合约当成安全的新增资金托管入口。

如后续确需承接旧合同，应先在旧协议支持的合法结算路径完成处理，再由相关方在新链确认剩余条款并重新入金；未解决争议不能通过复制状态宣称解决。对外展示历史映射时使用 `(chain_id, escrow_address, project_id)` 关联新的 Project PDA，不能仅凭 EVM 数字 ID 匹配。

EVM 地址与 Solana 公钥没有自动的一一对应关系。需要证明双方身份连续性时，应由旧地址与新地址分别签署含域、目标链、项目和 nonce 的关联声明。桥接真实 USDC 是单独的资金流；当前任意增发的 Fuji MockUSDC 不能当作真实 USDC 自动兑换或桥接。

现有 Solidity 合约、EVM ABI 和历史测试继续作为业务参考。新程序上线的完成条件是账户隔离、角色约束、金额守恒、全部结算路径以及客户端确认流程同时成立。
