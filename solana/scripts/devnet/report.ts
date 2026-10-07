import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PublicKey, SignatureStatus } from "@solana/web3.js";
import { ata, DevnetClient, status } from "./client";
import { delay, hash, verifyDeployment } from "./environment";
import { auditEvents } from "./events";

export const txUrl = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
export const addressUrl = (address: string) => `https://explorer.solana.com/address/${address}?cluster=devnet`;

async function finalizeReceipts(c: DevnetClient) {
  const entries = Object.entries(c.journal.state.transactions);
  assert.ok(entries.every(([, value]) => value.status === "passed"), "Some transactions remain unresolved");
  for (let attempt = 0; attempt < 40; attempt++) {
    const statuses: (SignatureStatus | null)[] = [];
    for (let offset = 0; offset < entries.length; offset += 256) {
      statuses.push(...(await c.env.connection.getSignatureStatuses(entries.slice(offset, offset + 256).map(([, value]) => value.signature),
        { searchTransactionHistory: true })).value);
    }
    if (statuses.every(value => value?.confirmationStatus === "finalized")) {
      entries.forEach(([, value], index) => {
        const actual = statuses[index]!;
        assert.equal(actual.slot, value.slot);
        assert.equal(!!actual.err, !!value.expectedError);
      });
      return;
    }
    console.log(`Finality: ${statuses.filter(value => value?.confirmationStatus === "finalized").length}/${entries.length}`);
    await delay(3000);
  }
  throw new Error("Transactions are confirmed but still awaiting finalized commitment");
}

export async function writeReport(c: DevnetClient, complete: boolean) {
  const deployment = await verifyDeployment(c.env);
  const manifest = JSON.parse(readFileSync(resolve("deployments/devnet-deployment.json"), "utf8")) as {
    deploymentSignature: string; programId: string; artifactSha256: string; deploymentSlot: string;
  };
  assert.equal(manifest.programId, deployment.programId);
  assert.equal(manifest.artifactSha256, deployment.artifactSha256);
  assert.equal(manifest.deploymentSlot, deployment.deploymentSlot);
  if (complete) {
    for (const required of ["lifecycle-all-paths-completed", "capacity-20-completed", "security-suite-completed", "boundary-suite-completed", "expired-unfunded-regression"]) {
      assert.ok(c.journal.state.checks[required]?.passed, `Missing required verification: ${required}`);
    }
    await finalizeReceipts(c);
    auditEvents(c);
  }
  const projects = [];
  for (const [name, ref] of Object.entries(c.journal.state.projects)) {
    const account = await c.env.connection.getAccountInfo(new PublicKey(ref.address), "confirmed");
    if (!account) { projects.push({ name, address: ref.address, status: "not-created-as-expected" }); continue; }
    const p = await c.project(ref);
    const state = status(p.status);
    const accounting = ["funded", "completed"].includes(state) ? await c.conserved(ref, name === "lifecycle" ? 9n : 0n) : undefined;
    projects.push({ name, address: ref.address, explorer: addressUrl(ref.address), status: state,
      expectedMilestones: p.expectedMilestones, milestoneCount: p.milestoneCount, settledCount: p.settledCount,
      totalBaseUnits: p.totalAmount.toString(), settledBaseUnits: p.settledAmount.toString(),
      sellerPaidBaseUnits: p.sellerPaidAmount.toString(), buyerRefundBaseUnits: p.buyerRefundedAmount.toString(), accounting });
  }
  const transactions = Object.entries(c.journal.state.transactions).map(([name, value]) => ({
    name, signature: value.signature, explorer: txUrl(value.signature), status: value.status,
    expectedError: value.expectedError ?? null, observedError: value.observedError ?? null,
    slot: value.slot, blockTime: value.blockTime, feeLamports: value.feeLamports,
    confirmation: complete ? "finalized" : "confirmed",
  }));
  const wallets = {} as Record<string, { address: string; lamports: number; usdcBaseUnits: string }>;
  for (const name of ["payer", "buyer", "seller", "arbitrator", "stranger"] as const) {
    const address = c.env[name].publicKey;
    assert.equal(address.toBase58(), (c.journal.state.metadata.wallets as Record<string, string>)[name], "Wallet identity changed since this run started");
    wallets[name] = { address: address.toBase58(), lamports: await c.env.connection.getBalance(address, "confirmed"),
      usdcBaseUnits: (await c.balance(ata(address))).toString() };
  }
  const records = {
    status: complete ? "passed" : "waiting-for-auto-release", runId: c.journal.state.runId,
    startedAt: c.journal.state.startedAt, recordedAt: new Date().toISOString(), network: "devnet",
    deployment: { ...deployment, deploymentSignature: manifest.deploymentSignature,
      idlSha256: hash(readFileSync(resolve("target/idl/solpact.json"))) },
    autoRelease: c.journal.state.metadata.autoRelease, wallets, projects,
    counts: { transactions: transactions.length, successfulActions: transactions.filter(value => !value.expectedError).length,
      expectedOnChainRejections: transactions.filter(value => value.expectedError).length,
      assertions: Object.keys(c.journal.state.checks).length },
    checks: c.journal.state.checks, transactions,
    localOnlyChecks: ["Exact one-second boundaries under a controlled Clock", "Forged account owner/discriminator/version fixtures",
      "Second arbitration CPI fails because the test issuer freezes the recipient", "u64 maximum exhaustive rounding property tests"],
  };
  mkdirSync(resolve("deployments"), { recursive: true });
  writeFileSync(resolve("deployments/devnet-test-results.json"), JSON.stringify(records, null, 2) + "\n");
  const keys = ["lifecycle/create", "lifecycle/deposit", "lifecycle/submit/1", "lifecycle/approve/0", "lifecycle/arbitrate/3",
    "lifecycle/arbitrate/4", "lifecycle/arbitrate/5", "lifecycle/refund/2", "lifecycle/auto-release/1", "capacity/approve/0"];
  const elapsed = c.journal.state.checks["lifecycle-all-paths-completed"]?.details as { elapsedSeconds?: number } | undefined;
  const md = [
    "# SolPact Devnet 部署与完整测试报告", "",
    `状态：**${complete ? "全部通过" : "其他流程完成，等待真实自动领取窗口"}**。记录时间：${records.recordedAt}。`, "",
    `程序：[${deployment.programId}](${addressUrl(deployment.programId)})。使用 Circle Devnet USDC，6 位小数。`, "",
    `部署交易：[查看交易](${txUrl(records.deployment.deploymentSignature)})。已逐字节比对链上 ProgramData 与本地 SBF 产物。`, "",
    `SBF SHA256：\`${deployment.artifactSha256}\`。IDL SHA256：\`${records.deployment.idlSha256}\`。`, "",
    "## 验证结果", "",
    `共记录 ${records.counts.transactions} 笔测试交易：${records.counts.successfulActions} 笔操作成功，${records.counts.expectedOnChainRejections} 笔负向用例按预期在链上失败；${records.counts.assertions} 项状态、权限与金额断言通过。${complete ? "所有测试交易均已达到 finalized。" : "结果尚未包含超时领取的最终验证。"}`, "",
    `主项目使用 6 个里程碑，合同总额 2.7 USDC。涵盖买方批准、卖方自动领取、逾期退款、70/30 仲裁、全额买方退款、全额卖方付款。${complete ? "链上结果为" : "最终预期"}卖方实收 1.55、买方退款 1.15 USDC，9 个误转最小单位留在金库。`, "",
    `自动领取窗口保持正式的 3,600 秒，按链上 Clock 等待。${elapsed?.elapsedSeconds ? `本次领取前观测到已等待 ${elapsed.elapsedSeconds} 秒。` : "自动领取尚待窗口到期。"}`, "",
    "另验证 20 个里程碑、最长文本、草稿恢复、逆序付款、未入金取消、小金额舍入以及角色和账户替换保护。负向用例实际提交到 Devnet，核对失败交易和受保护账户数据未变。", "",
    "## 关键交易", "", "| 测试步骤 | 交易 |", "| --- | --- |",
    ...keys.filter(key => c.journal.state.transactions[key]).map(key => `| ${key} | [查看](${txUrl(c.journal.state.transactions[key].signature)}) |`), "",
    "## 项目最终状态", "", "| 项目 | 地址 | 状态 |", "| --- | --- | --- |",
    ...projects.filter(project => project.status !== "not-created-as-expected").map(project => `| ${project.name} | [${project.address}](${addressUrl(project.address)}) | ${project.status} |`), "",
    "## 复现和范围", "",
    "运行方式见 [Devnet 测试说明](../scripts/devnet/README.md)，全部交易、角色公钥、金额及断言见 [机器可读结果](devnet-test-results.json)。钱包密钥、带 API key 的 RPC URL 和签名交易缓存均留在被忽略的 `.devnet/` 中。", "",
    "测试直接使用真实 Devnet RPC、SPL Token 和独立角色钱包，未替换币种、缩短自动领取窗口或修改已部署业务逻辑。钱包浏览器 UI 尚未接入托管指令。", "",
    "精确单秒边界、伪造账户内部数据、发行方冻结导致第二笔 CPI 回滚、u64 最大金额等夹具测试仍在本地 SVM/Rust 中验证，未宣称在公共 Devnet 上控制时钟或发行方权限。", "",
  ].join("\n");
  writeFileSync(resolve("deployments/devnet-test-report.md"), md);
  console.log(`REPORT ${records.status}: ${records.counts.transactions} transactions, ${records.counts.assertions} assertions`);
}
