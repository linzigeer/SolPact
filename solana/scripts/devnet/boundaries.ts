import assert from "node:assert/strict";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { bn, DevnetClient, status } from "./client";
import { rejection } from "./checks";
import { chainTime, delay } from "./environment";

export async function boundaryCases(c: DevnetClient) {
  if (c.journal.state.checks["boundary-suite-completed"]) return;
  const now = await chainTime(c.env.connection);
  const late = c.plan("expired-funding", [1n], [now + 90]);
  await c.ready("expired-funding", late);
  await rejection(c, "boundaries/nonbuyer-deposit", late, () =>
    c.deposit("boundaries/nonbuyer-deposit", late, "Unauthorized", c.env.stranger));

  const overflow = c.plan("overflow", [(1n << 64n) - 1n, 1n], [now + 600, now + 600]);
  await c.create("overflow", overflow); await c.add("overflow", overflow, 0);
  await rejection(c, "boundaries/total-overflow", overflow, async () => c.tx.send("boundaries/total-overflow",
    [await c.ix("addMilestone", [1, bn(1), bn(overflow.deadlines[1]), "Overflow must roll back"], {
      buyer: c.env.buyer.publicKey, project: new PublicKey(overflow.address), milestone: c.milestone(overflow, 1),
      systemProgram: SystemProgram.programId,
    })], [c.env.buyer], "MathOverflow"));
  const project = await c.project(overflow);
  assert.equal(project.totalAmount.toString(), ((1n << 64n) - 1n).toString());
  assert.equal(project.milestoneCount, 1);
  assert.equal(await c.env.connection.getAccountInfo(c.milestone(overflow, 1)), null);
  await c.manage("overflow/cancel", overflow, "cancelProject");

  const ref = c.journal.state.projects.lifecycle;
  await rejection(c, "boundaries/buyer-auto-release", ref, () =>
    c.settle("boundaries/buyer-auto-release", ref, "claimAutoRelease", 1, c.env.buyer, 7000, "Unauthorized"));
  await rejection(c, "boundaries/seller-refund", ref, () =>
    c.settle("boundaries/seller-refund", ref, "refundOnDeadlineMiss", 2, c.env.seller, 7000, "Unauthorized"));
  while (await chainTime(c.env.connection) <= late.deadlines[0]) {
    console.log(`Waiting for real expired-funding deadline ${late.deadlines[0]}`); await delay(5000);
  }
  await rejection(c, "boundaries/expired-deposit", late, () =>
    c.deposit("boundaries/expired-deposit", late, "DeadlinePassed"));
  assert.equal(status((await c.project(late)).status), "created");
  assert.equal(await c.balance(new PublicKey(late.vault)), 0n);
  await c.manage("expired-funding/cancel", late, "cancelProject");
  c.journal.check("boundary-suite-completed", { overflowRolledBack: true, expiredFundingRejected: true });
}
