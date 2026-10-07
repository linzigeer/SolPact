# Devnet 部署与真实交易测试

本目录使用真实 Solana Devnet RPC、已部署 SBF 程序和 Circle Devnet USDC 运行全部公开指令。默认测试包含真实的一小时自动领取等待，不能用本地 Clock 推进替代。

测试入口与本地 `pnpm test` 分开；本地检查不会触发任何网络交易。这里的所有脚本都在首次转账前核验 Devnet genesis hash、Program ID、Mint 精度及链上程序字节与本地 `.so` 一致。不得在测试期间升级程序、替换密钥或并行启动两个测试进程。

## 配置与部署

在 `solana/` 目录执行。已有本地工具链的准备方式见 [工程说明](../../README.md)。

```bash
corepack pnpm check

# 使用 Devnet 配置以及自己的部署 keypair；命令中的路径需替换。
solana --config /path/to/devnet-config.yml program deploy \
  target/deploy/solpact.so \
  --program-id target/deploy/solpact-keypair.json \
  --use-rpc --output json

# 参数必须是上述真实部署交易的签名。
corepack pnpm devnet:record-deployment DEPLOYMENT_SIGNATURE
```

程序 keypair、`declare_id!` 和 `Anchor.toml` 中的地址必须相同。在新 checkout 中需要新 Program ID 时先 `anchor keys sync` 再重新 build。部署会支出 Devnet SOL 手续费和程序存储押金；默认钱包保留程序升级权限。

脚本按顺序读取 `SOLPACT_SOLANA_CONFIG` 指定的 CLI 配置、`.devnet/cli-config.yml` 或默认 Solana CLI 配置。可通过以下环境变量覆盖：

| 变量 | 用途 |
| --- | --- |
| `SOLPACT_DEVNET_RPC_URL` | Devnet RPC；可以包含供应商 API key，但不能提交到仓库 |
| `SOLPACT_DEPLOYER_KEYPAIR` | 部署者兼测试 fee payer 的本地 keypair 路径 |
| `SOLPACT_SOLANA_CONFIG` | 专用 Solana CLI YAML 配置文件路径 |

程序默认支持的 Mint 为 `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`。fee payer 至少准备 5 个该 Mint 的测试 USDC，以及足够的 Devnet SOL。可在 [Circle 官方水龙头](https://faucet.circle.com) 选择 USDC / Solana Devnet 领取；人机验证由用户完成。测试不会通过改变 Mint 白名单绕开测试币准备。

## 一次执行与恢复

```bash
corepack pnpm test:devnet
```

首次运行会创建独立 Buyer、Seller、Arbitrator 和 Stranger 钱包，给 Buyer 转 0.5 Devnet SOL，其余各转 0.05 Devnet SOL，再给 Buyer 转 5 个测试 USDC。角色 keypair、带凭据的本地 RPC 配置和交易缓存位于被忽略的 `.devnet/`；公钥与交易签名写入公开测试报告。

流程先创建、入金和提交主项目，尽早启动 3,600 秒的自动领取窗口。之后执行付款、争议、退款、负向用例和 20 个里程碑容量流程，最后等待链上 Clock 达到领取时间，发送真实领取交易，核验全部测试交易为 finalized 并输出报告。

若要先执行非等待部分：

```bash
corepack pnpm test:devnet --no-wait
# 之后继续等待并完成自动领取及最终报告
corepack pnpm devnet:finish
# 只读查看进度、未确认交易和剩余等待时间
corepack pnpm devnet:status
```

每笔交易在广播前将签名、签名后的字节和有效区块高度写入 `.devnet/run-state.json`。再次运行复用同一项目和交易记录，已完成步骤不重复发送。RPC 返回不确定时先查同一签名；遇到过期且无法确认的交易会停止并要求核对账户，不擅自创建第二笔入金。

正常完成后再次运行只重新核验并生成报告。开始新一轮测试前应归档已有 `.devnet/run-state.json` 和公开报告，确认旧项目均已处理完毕；保留对应角色密钥供历史资金核对。不要在活跃自动领取窗口内删除运行记录。

## 模块划分

| 文件 | 职责 |
| --- | --- |
| `environment.ts` | 配置、私钥文件、Devnet 保护、Mint 与部署字节校验、链上时钟 |
| `journal.ts` | 持久化运行状态、项目参数和断言 |
| `transactions.ts` | 带唯一测试标记的交易、广播、确认、预期链上失败核对 |
| `client.ts` | PDA/ATA 推导、指令构建、账户解码和金额守恒 |
| `checks.ts` | 付款前后实际余额差、拒绝操作前后账户快照 |
| `prepare.ts` | 角色资金准备和主流程计时启动 |
| `lifecycle.ts` | 六个里程碑的全部结算路径及保护条件 |
| `security.ts` | 跨项目隔离、角色权限、参数边界、取消、舍入 |
| `capacity.ts` | 20 个里程碑、最长文本、草稿恢复和逆序结算 |
| `boundaries.ts` | 真实截止时间后的入金拒绝、金额溢出和调用者权限 |
| `finish.ts` | 超期未入金回归、真实时钟等待及最终领取 |
| `record-deployment.ts` | 将真实部署签名与当前链上部署槽位、字节进行绑定 |
| `report.ts` | 最终性审查、结构化结果与中文报告 |
| `events.ts` | 按已部署 IDL 解码并核验每个里程碑只有一次结算事件 |
| `run.ts` | 按顺序编排全部阶段 |

`immediate.ts`、`security-run.ts`、`capacity-run.ts`、`boundaries-run.ts` 是各阶段的独立恢复入口，应顺序运行，避免运行日志被并发改写。

## 报告与测试边界

部署记录位于 `deployments/devnet-deployment.json`，测试结果位于 `deployments/devnet-test-results.json` 和 `deployments/devnet-test-report.md`。报告包含代码哈希、部署地址、各角色公钥、实际余额、项目状态、断言和全部交易签名。预期失败的负向用例也是真实提交的 Devnet 交易，并会消耗少量测试 SOL 手续费。

公共 Devnet 无法由测试者任意修改 Clock、伪造 program-owned 账户内部数据或使用 Circle 的冻结权限。因此精确单秒边界、伪造账户夹具和第二笔 CPI 冻结回滚仍由本地 Rust/LiteSVM 测试覆盖。Devnet 测试验证真实网络上的完整协议流程，不包含前端钱包 UI 自动化。
