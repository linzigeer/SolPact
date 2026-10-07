import assert from "node:assert/strict";
import { SystemProgram } from "@solana/web3.js";
import { createTransferCheckedInstruction } from "@solana/spl-token";
import { ata, DevnetClient } from "./client";
import { chainTime, environment, MINT, verifyDeployment } from "./environment";
import { Journal } from "./journal";

export async function prepare() {
  const env = environment(), journal = new Journal(), c = new DevnetClient(env, journal);
  const deployment = await verifyDeployment(env);
  const wallets = Object.fromEntries((["payer", "buyer", "seller", "arbitrator", "stranger"] as const).map(role =>
    [role, env[role].publicKey.toBase58()]));
  if (journal.state.metadata.wallets) assert.deepEqual(wallets, journal.state.metadata.wallets, "Wallets differ from the saved run; do not replace keys during a test");
  journal.state.metadata.deployment = deployment;
  journal.state.metadata.wallets = wallets; journal.save();
  console.log(`Verified Devnet program ${deployment.programId}`);
  if (journal.state.checks["lifecycle-funded-and-submitted"]) return c;
  for (const [role, amount] of [[env.buyer, 500_000_000], [env.seller, 50_000_000], [env.arbitrator, 50_000_000], [env.stranger, 50_000_000]] as const) {
    await c.tx.send(`setup/SOL/${role.publicKey.toBase58()}`, [SystemProgram.transfer({ fromPubkey: env.payer.publicKey, toPubkey: role.publicKey, lamports: amount })]);
  }
  await c.tx.send("setup/recipient-atas", [c.ataIx(env.buyer.publicKey), c.ataIx(env.seller.publicKey), c.ataIx(env.stranger.publicKey)]);
  if (!journal.state.transactions["setup/USDC"] || journal.state.transactions["setup/USDC"].status !== "passed") {
    assert.ok(await c.balance(ata(env.payer.publicKey)) >= 5_000_000n, "Fund the deployer with at least 5 Circle Devnet USDC");
  }
  await c.tx.send("setup/USDC", [createTransferCheckedInstruction(ata(env.payer.publicKey), MINT, ata(env.buyer.publicKey), env.payer.publicKey, 5_000_000n, 6)]);

  const now = await chainTime(env.connection);
  const amounts = [200_000n, 300_000n, 400_000n, 500_000n, 600_000n, 700_000n];
  const ref = c.plan("lifecycle", amounts, amounts.map(() => now + 300));
  await c.ready("lifecycle", ref);
  await c.deposit("lifecycle/deposit", ref);
  // Start the real one-hour window before the rest of the Devnet test suite.
  await c.act("lifecycle/submit/1", ref, "submitDelivery", 1, env.seller);
  for (const index of [0, 3, 4, 5]) await c.act(`lifecycle/submit/${index}`, ref, "submitDelivery", index, env.seller);
  const milestone = await c.item(ref, 1);
  journal.state.metadata.autoRelease = { project: ref.address, milestoneIndex: 1,
    submittedAt: milestone.submittedAt.toString(), windowSeconds: 3600,
    unlockAt: Number(milestone.submittedAt.toString()) + 3600 };
  journal.save();
  journal.check("lifecycle-funded-and-submitted", await c.conserved(ref));
  console.log(JSON.stringify(journal.state.metadata.autoRelease));
  return c;
}

if (require.main === module) prepare().catch(error => {
  console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1;
});
