# SolPact Devnet 部署与完整测试报告

状态：**其他流程完成，等待真实自动领取窗口**。记录时间：2026-10-07T07:16:48.187Z。

程序：[8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt](https://explorer.solana.com/address/8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt?cluster=devnet)。使用 Circle Devnet USDC，6 位小数。

部署交易：[查看交易](https://explorer.solana.com/tx/2U9hxy3Vd4LXTrdfQZdriTtmxtstAGpb584UAFLYBdc7B7G3eXrXaU9Qhy9jApYhPk2fgpjjJYJXJ1EEWKjHd1Ye?cluster=devnet)。已逐字节比对链上 ProgramData 与本地 SBF 产物。

SBF SHA256：`13e31f61faa42d55894ee65f99642eaa9adfb315b62ef7a951aaf701734d63b3`。IDL SHA256：`c89ea1af3722f1fcdfdca91765817b61e6d12f96bc2180ee1d575889af1baa76`。

## 验证结果

共记录 173 笔测试交易：128 笔操作成功，45 笔负向用例按预期在链上失败；79 项状态、权限与金额断言通过。结果尚未包含超时领取的最终验证。

主项目使用 6 个里程碑，合同总额 2.7 USDC。涵盖买方批准、卖方自动领取、逾期退款、70/30 仲裁、全额买方退款、全额卖方付款。最终预期卖方实收 1.55、买方退款 1.15 USDC，9 个误转最小单位留在金库。

自动领取窗口保持正式的 3,600 秒，按链上 Clock 等待。自动领取尚待窗口到期。

另验证 20 个里程碑、最长文本、草稿恢复、逆序付款、未入金取消、小金额舍入以及角色和账户替换保护。负向用例实际提交到 Devnet，核对失败交易和受保护账户数据未变。

## 关键交易

| 测试步骤 | 交易 |
| --- | --- |
| lifecycle/create | [查看](https://explorer.solana.com/tx/5RwbqW2L592RBnG1hGYwnK1epvWBHV8SaAKseRVins3SW4B8JE2hVSAjHrsdww11jb7xjnAddReLXc1uvS6UrWbF?cluster=devnet) |
| lifecycle/deposit | [查看](https://explorer.solana.com/tx/5BC921zq7H3g7BQDDd6G7c58JpVpQZvWrfNpNxuBY39R7juDNBouqf4GSasUxdzfwZwyU2YAKkdiSbnRjTnP1nSA?cluster=devnet) |
| lifecycle/submit/1 | [查看](https://explorer.solana.com/tx/2Qsx2gKEw8SaSQuejnnHSQy3pS2rMWgAzjUPCRi9EqsjwdwoFEDcPPDF7jxiATvgZhK3xWPUasGt2GhcAv7JNg8a?cluster=devnet) |
| lifecycle/approve/0 | [查看](https://explorer.solana.com/tx/4UZudSEDbug3TM725rr4NNpBKhQXefNvWY1EdWjx7JQgVw7Usxa2gLd7zHbyAdEHfRBYThRkpQKbmwckoCfRfCaN?cluster=devnet) |
| lifecycle/arbitrate/3 | [查看](https://explorer.solana.com/tx/5nqowS7p1GgRmqXAXRb7dheFjq3uoQ8GL6t7vQ48JAcdDpSk9kx3swk5epDbZbLBpMVqBXeU1SkTLxWqqZMnC5nx?cluster=devnet) |
| lifecycle/arbitrate/4 | [查看](https://explorer.solana.com/tx/8RkRhgxHT7evbLoSyrcYHh49tfgctp2FgrGyKakGpiynzNQtCiToXt7vdYHorQckNjd55yGhFVxDjNLYEM8v6wW?cluster=devnet) |
| lifecycle/arbitrate/5 | [查看](https://explorer.solana.com/tx/5UgrZY6g7M3UtZ89vdACbxEGHT7SYGoKvPV9bZohca1jwbpKikZsAjYaw8pWjp6xRp5HzoqYxRRToAZEtNuUbcbj?cluster=devnet) |
| lifecycle/refund/2 | [查看](https://explorer.solana.com/tx/4GB7GckxJ7dpKPG2ZPiw1bsVwt82WWY7dqC73LZT4rbwd9ZUXX3Bbvc5EQC6DJvn6XUuukzTrsyVpnf9uF4ws7Cc?cluster=devnet) |
| capacity/approve/0 | [查看](https://explorer.solana.com/tx/4fowjPHwVp4fSBAsdkwQcKqgUN8rhpRsVLMMNXbbdpZyChkjamGqZzJNq4jQb3oocrmKd9gMpDnyJLqLiPgBaZ73?cluster=devnet) |

## 项目最终状态

| 项目 | 地址 | 状态 |
| --- | --- | --- |
| lifecycle | [5jomfq9NLVRUH8qaqTKU8FfxNJYK6VJ7J42zf8wPuPiS](https://explorer.solana.com/address/5jomfq9NLVRUH8qaqTKU8FfxNJYK6VJ7J42zf8wPuPiS?cluster=devnet) | funded |
| unfunded | [GQFndQTJowv2W2Kd9Jx6SWZGQrrpJUcqYsyudbzErh7v](https://explorer.solana.com/address/GQFndQTJowv2W2Kd9Jx6SWZGQrrpJUcqYsyudbzErh7v?cluster=devnet) | cancelled |
| isolation | [6HrfS9oTzCXmCXm6k4Z2KPv5TCtosoLPsfNj5ceebj6o](https://explorer.solana.com/address/6HrfS9oTzCXmCXm6k4Z2KPv5TCtosoLPsfNj5ceebj6o?cluster=devnet) | completed |
| no-arbitrator | [G41dt8kqUGThvuyYoHdpCHY41KanrqaSu2JLmthmje2b](https://explorer.solana.com/address/G41dt8kqUGThvuyYoHdpCHY41KanrqaSu2JLmthmje2b?cluster=devnet) | completed |
| rounding | [6G5TmNapAbdKak3XB8sX2Sgs6hg4pBkyrALaRiQjCJLx](https://explorer.solana.com/address/6G5TmNapAbdKak3XB8sX2Sgs6hg4pBkyrALaRiQjCJLx?cluster=devnet) | completed |
| invalid-append | [BK5fcmkKGvNEnfkmy5dR42fuJb6CwBh4ACjpnqksduXY](https://explorer.solana.com/address/BK5fcmkKGvNEnfkmy5dR42fuJb6CwBh4ACjpnqksduXY?cluster=devnet) | cancelled |
| cancel-created | [694rm3ioioX3ckLjwG3vZ32Msg1SRgnJoCJrL3Dv419a](https://explorer.solana.com/address/694rm3ioioX3ckLjwG3vZ32Msg1SRgnJoCJrL3Dv419a?cluster=devnet) | cancelled |
| capacity | [D3hL7zPiSTHkNzEeSRV4ZvHzF9kbX98YTKFjXuH4k3do](https://explorer.solana.com/address/D3hL7zPiSTHkNzEeSRV4ZvHzF9kbX98YTKFjXuH4k3do?cluster=devnet) | completed |
| expired-funding | [G6AeBPBmfNdWr3c7vNNXj7WmYXMiKgCBRJZxv4bUoHyt](https://explorer.solana.com/address/G6AeBPBmfNdWr3c7vNNXj7WmYXMiKgCBRJZxv4bUoHyt?cluster=devnet) | cancelled |
| overflow | [42ckV9uqPNVHvgv8aKLSY1AGHcPSegmxfCtS8PAQ7puU](https://explorer.solana.com/address/42ckV9uqPNVHvgv8aKLSY1AGHcPSegmxfCtS8PAQ7puU?cluster=devnet) | cancelled |

## 复现和范围

运行方式见 [Devnet 测试说明](../scripts/devnet/README.md)，全部交易、角色公钥、金额及断言见 [机器可读结果](devnet-test-results.json)。钱包密钥、带 API key 的 RPC URL 和签名交易缓存均留在被忽略的 `.devnet/` 中。

测试直接使用真实 Devnet RPC、SPL Token 和独立角色钱包，未替换币种、缩短自动领取窗口或修改已部署业务逻辑。钱包浏览器 UI 尚未接入托管指令。

精确单秒边界、伪造账户内部数据、发行方冻结导致第二笔 CPI 回滚、u64 最大金额等夹具测试仍在本地 SVM/Rust 中验证，未宣称在公共 Devnet 上控制时钟或发行方权限。
