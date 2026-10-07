# SolPact Solana 合约

独立 Anchor 工作区，实现 [合约改写指导](../docs/06-solana-contract-migration.md) 中的项目托管协议。11 个公开指令已实现，包含分批创建、入金、交付、确认付款、自动领取、逾期退款、争议仲裁和未入金取消。

程序已通过本地 SBF 执行测试并部署到 Devnet；已记录的真实交易测试报告仍待完成最后的一小时自动领取验证，进度和交易见 [Devnet 测试报告](deployments/devnet-test-report.md)。`web/` 已包含托管交易和项目账户查询实现，完整浏览器买卖方流程仍待验证。默认构建只接受 Circle Devnet USDC Mint；本地 SVM 测试使用隔离的同地址测试 Mint，Devnet 测试则使用链上实际发行的测试 USDC。

## 运行与验证

需要 Anchor CLI 0.31.1、Rust/Cargo、Node.js 20 或以上和 Corepack。首次使用：

```bash
cd solana
corepack pnpm install --frozen-lockfile
corepack pnpm setup:tools
corepack pnpm check
```

`setup:tools` 将 `cargo-build-sbf 4.4.0` 安装到本目录的 `.tools/`，不替换全局 Solana CLI。首次构建下载 platform-tools v1.54，使用其 Rust 1.89；主机 Rust 也需满足本工程及构建器的编译要求。本次验证使用主机 Rust 1.98.1、Anchor 0.31.1、Solana CLI 2.1.0。

`check` 依次执行格式检查、SBF 和 IDL 构建、Rust 单元测试、Clippy、TypeScript 类型检查、功能测试和集成测试。全部测试无需运行 RPC validator、配置钱包或领取测试币。

| 命令 | 用途 |
| --- | --- |
| `corepack pnpm build` | 构建实际 SBF 程序并生成 IDL 和 TS 类型 |
| `corepack pnpm test:rust` | 21 个 Rust 单元测试，包含 Anchor 的 Program ID 测试 |
| `corepack pnpm test:unit` | 34 个指令功能与安全测试，加载真实 SBF 程序 |
| `corepack pnpm test:integration` | 2 个完整流程集成测试 |
| `corepack pnpm test` | 运行全部 36 个 SBF 执行测试；需先 build |
| `corepack pnpm typecheck` | 检查测试代码与生成的账户类型 |
| `corepack pnpm lint:rust` | 执行 Clippy |
| `corepack pnpm test:devnet` | 使用真实 Devnet 钱包和测试币运行协议测试，包含真实一小时等待 |
| `corepack pnpm devnet:status` | 查看 Devnet 测试进度与自动领取剩余时间 |

构建脚本固定 SBPF v0 指令集，以兼容当前运行时；新版本构建器的默认 v3 不能直接用于这里的测试。Anchor 0.31.1 会把额外构建参数传给 IDL 生成步骤，因此脚本分别构建 SBF 和 IDL。Token-2022 模块仅为解决该版本 Anchor SPL 的 IDL 生成依赖而在 `idl-build` feature 中开启，公开指令始终校验经典 `Program<Token>`。

构建输出位于 `target/deploy/solpact.so`、`target/idl/solpact.json` 和 `target/types/solpact.ts`。`Cargo.lock` 与 `pnpm-lock.yaml` 已固定依赖；`target/`、`.tools/`、钱包密钥和 `node_modules/` 不入库。

## 目录与模块职责

```text
solana/
  Anchor.toml                 本地 Anchor 配置与 Program ID
  Cargo.toml / Cargo.lock     独立 Rust 工作区和锁文件
  package.json               构建、测试和校验入口
  programs/solpact/src/
    lib.rs                   仅声明程序与分发指令
    constants.rs             seeds、Mint、精度、窗口与长度上限
    errors.rs                稳定业务错误码
    events.rs                项目、交付、争议与结算事件
    state/
      project.rs             Project 账户和项目状态
      milestone.rs           Milestone 账户和里程碑状态
    contexts/
      creation.rs            创建与追加的账户约束
      project.rs             finalize/cancel 账户约束
      deposit.rs             入金账户约束
      milestone.rs           交付和争议账户约束
      settlement.rs          四类结算共用的账户关系约束
    instructions/
      create_project.rs      每个公开指令各自一个实现文件
      add_milestone.rs
      ...
      settle.rs              结算流程编排，状态与 CPI 在同一交易中
    logic/
      validation.rs          角色、窗口、数量与文本校验
      project.rs             项目状态转换
      milestone.rs           交付和争议状态转换
      settlement.rs          分账计算与账本守恒
      tests/                 按领域拆分的 Rust 单元测试
    utils/token.rs           仅封装 PDA 签名的 Token CPI
  tests/
    helpers/
      runtime.ts             隔离 SVM、测试 Mint、Clock 和交易执行
      client.ts              指令构建与正常业务流程夹具
      pdas.ts                PDA/ATA 推导和测试常量
      assertions.ts          错误、余额与账本守恒断言
    unit/                    按指令或功能组织的测试文件
    integration/
      full-lifecycle.test.ts 全结算流程与 20 个里程碑恢复流程
  scripts/
    setup-build-tools.sh     安装目录内固定版本构建器
    build.sh                 构建实际程序和 IDL
```

账户结构只负责数据布局；`contexts/` 验证 Signer、Program owner、PDA、父子关系、Mint 和 ATA。指令 handler 负责业务角色和流程分发；`logic/` 负责可独立测试的状态与算术；Token CPI 集中在 `utils/`。新增结算方式时应复用共用账本函数，避免重复计算金额或完成条件。

## 指令与客户端账户准备

| 指令 | 业务签名者 | 输入与效果 |
| --- | --- | --- |
| `create_project` | Buyer | 16 字节项目 ID、Seller、可选 Arbitrator、预计数量、自动领取窗口；创建 Draft |
| `add_milestone` | Buyer | 顺序 index、金额、deadline、description；只允许向 Draft 追加 |
| `finalize_project` | Buyer | 条目齐全且期限有效时变为 Created |
| `cancel_project` | Buyer | 只取消 Draft/Created，保留账户历史 |
| `deposit` | Buyer | Created 且未过最早期限时，将全额从 Buyer ATA 转入 Vault |
| `submit_delivery` | Seller | deadline 当秒或以前提交非空 URI |
| `approve_milestone` | Buyer | 将 Submitted 里程碑全额付给 Seller |
| `claim_auto_release` | Seller | 自提交后达到窗口时领取，需主动发送交易 |
| `refund_on_deadline_miss` | Buyer | deadline 严格过去后退还 Pending 里程碑 |
| `raise_dispute` | Buyer 或 Seller | 有仲裁员时将 Submitted 改为 Disputed |
| `resolve_dispute` | 指定 Arbitrator | 按 0 至 10,000 基点分账，进入 Resolved |

Project PDA 使用 `["project", buyer, project_id_16_bytes]`；Milestone PDA 使用 `["milestone", project, index_u8]`。每个项目金库是 Project PDA 对应的 USDC ATA。客户端推导该 ATA 时应允许 off-curve owner。

`create_project` 接收已经存在的 Vault ATA，客户端在同一交易的前序指令中使用幂等 ATA 创建即可；测试覆盖了第三方提前创建和转入额外代币的情况。所有结算共用 `SettleMilestone`，因此均需传入 Buyer ATA 和 Seller ATA；即使某方此次收款为零，该账户也需存在。任意出资方都能幂等创建接收方 ATA，不要求收款人签名。交易 fee payer 与业务角色无关。

金额为 6 位小数的 `u64` 最小单位，分账采用 `u128` 中间值，余数归 Buyer。客户端不得使用浮点数生成转账金额。description 和 URI 都以 UTF-8 字节计，上限 256；URI 还拒绝空串及纯空白。

Project 空间为 247 字节，Milestone 为 604 字节，包含默认 Anchor discriminator。Buyer/Seller 字段在 Project 序列化数据中的偏移为 9/41；新增字段或修改布局后需重新计算索引过滤条件。

## 测试覆盖和集成结果

Rust 测试覆盖创建参数、状态转换、UTF-8 长度、账户空间、金额溢出、时间边界和分账守恒，其中遍历五种金额（包括 `u64::MAX`）及 0 至 10,000 的全部基点组合。

SBF 功能测试使用 LiteSVM 的真实 Solana 指令执行、签名检查、System/ATA/Token Program 与程序 CPI。仅测试 Mint 初始状态、资金空投、时钟及专门的伪造账户场景由夹具设置；正常项目状态和所有实际转账都通过指令产生，未关闭签名验证。

重点回归包括：未入金 B 无法退走 A 的资金，已入金项目不能互换金库或里程碑，错误收款 ATA/Token Program/账户版本被拒绝，缺少签名与移除 signer 标记均不能授权，重复结算失败，以及仲裁第二笔退款因冻结而失败时首笔付款与全部状态一并回滚。

第一个集成测试在一个六里程碑项目中依次执行全部结算路径，总额 2,700 USDC，最终 Seller 实收 1,550、Buyer 退款 1,150；金库额外收到的 9 个最小单位保留，不被最后一次结算带走。验证每笔后的金额守恒、状态、一次完成事件和每笔唯一结算事件，并覆盖独立草稿取消。

第二个集成测试创建 20 个最长描述的里程碑，在追加一半时中断客户端并从账户计数恢复，之后逆序交付和付款。所有测试交易在提交前均断言序列化长度不超过 legacy 交易的 1,232 字节。

本地时间边界测试通过 `Clock` 的 Unix 时间精确推进，未缩短正式合约的 1 小时至 90 天窗口。真实 Devnet 测试独立位于 `scripts/devnet/`，使用实际 RPC、独立角色钱包、真实交易确认及链上时间等待；配置、资金准备和恢复步骤见 [Devnet 测试说明](scripts/devnet/README.md)。浏览器钱包 UI 已包含托管指令实现，完整流程验证仍待完成。

## 部署配置与当前边界

默认 `SUPPORTED_MINT` 为 Circle Devnet USDC：`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`。`mainnet` Cargo feature 切换为官方 Mainnet Mint，必须在部署时显式选择并单独核对产物；测试套件预期默认 Devnet 配置。不存在运行时改 Mint、任意提现、资金托管管理员或测试增发指令。

当前 Devnet Program ID 为 [8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt](https://explorer.solana.com/address/8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt?cluster=devnet)，部署槽位、交易、升级权限和产物哈希记录在 [部署清单](deployments/devnet-deployment.json)。若在新环境创建不同部署，先生成独立程序 keypair，再用 `anchor keys sync` 同步声明和配置并重新构建。测试从生成的 IDL 获取 Program ID。密钥不提交到仓库；升级权限与项目仲裁员权限分开管理。

相对指导文档，结算事件统一为 `MilestoneSettled`，包含原因、状态和双方金额；一次结算只发出一条结算事件，最后一笔额外发出 `ProjectCompleted`，避免自动领取事件被重复计账。

首期保留以下协议边界：无仲裁超时或仲裁员替换，进入 Disputed 后只能由指定仲裁员处理；不关闭项目、里程碑或金库，不回收押金和误转盈余；不支持 Token-2022；不迁移旧链在途资金；程序工作区不包含前端或自动代签服务，前端实现在 `../web/`。若更改这些规则，需要独立调整协议、账户布局和测试。
