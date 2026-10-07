import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { createTransferCheckedInstruction } from "@solana/spl-token";
import { ata, DevnetClient, status } from "./client";
import { payment, rejection } from "./checks";
import { chainTime, MINT } from "./environment";

export async function immediateLifecycle(c: DevnetClient) {
  if (c.journal.state.checks["lifecycle-immediate-paths"]) return;
  const ref = c.journal.state.projects.lifecycle; assert.ok(ref, "Run prepare first");
  const { buyer, seller, arbitrator, stranger } = c.env;
  await rejection(c, "lifecycle/reject-repeat-deposit", ref, () => c.deposit("lifecycle/reject-repeat-deposit", ref, "InvalidProjectState"));
  await rejection(c, "lifecycle/reject-seller-approval", ref, () => c.settle("lifecycle/reject-seller-approval", ref, "approveMilestone", 0, seller, 7000, "Unauthorized"));
  await rejection(c, "lifecycle/reject-stranger-dispute", ref, () => c.act("lifecycle/reject-stranger-dispute", ref, "raiseDispute", 0, stranger, "Unauthorized"));
  await rejection(c, "lifecycle/reject-funded-cancel", ref, () => c.manage("lifecycle/reject-funded-cancel", ref, "cancelProject", "InvalidProjectState"));
  await rejection(c, "lifecycle/reject-early-auto-release", ref, () => c.settle("lifecycle/reject-early-auto-release", ref, "claimAutoRelease", 1, seller, 7000, "TooEarly"));

  await c.tx.send("lifecycle/donate-surplus", [createTransferCheckedInstruction(ata(buyer.publicKey), MINT, new PublicKey(ref.vault), buyer.publicKey, 9n, 6)], [buyer]);
  await payment(c, "lifecycle/approve/0", ref, "approveMilestone", 0, buyer, 200_000n, 0n, 7000, 9n);
  await rejection(c, "lifecycle/reject-repeat-approval", ref, () => c.settle("lifecycle/reject-repeat-approval", ref, "approveMilestone", 0, buyer, 7000, "InvalidMilestoneState"));
  for (const index of [3, 4, 5]) await c.act(`lifecycle/dispute/${index}`, ref, "raiseDispute", index, index === 4 ? seller : buyer);
  await rejection(c, "lifecycle/reject-disputed-approval", ref, () => c.settle("lifecycle/reject-disputed-approval", ref, "approveMilestone", 3, buyer, 7000, "InvalidMilestoneState"));
  await rejection(c, "lifecycle/reject-disputed-auto-release", ref, () => c.settle("lifecycle/reject-disputed-auto-release", ref, "claimAutoRelease", 3, seller, 7000, "InvalidMilestoneState"));
  await rejection(c, "lifecycle/reject-disputed-refund", ref, () => c.settle("lifecycle/reject-disputed-refund", ref, "refundOnDeadlineMiss", 3, buyer, 7000, "InvalidMilestoneState"));
  await rejection(c, "lifecycle/reject-wrong-arbitrator", ref, () => c.settle("lifecycle/reject-wrong-arbitrator", ref, "resolveDispute", 3, stranger, 7000, "Unauthorized"));
  await rejection(c, "lifecycle/reject-invalid-bps", ref, () => c.settle("lifecycle/reject-invalid-bps", ref, "resolveDispute", 3, arbitrator, 10001, "InvalidBps"));
  await payment(c, "lifecycle/arbitrate/3", ref, "resolveDispute", 3, arbitrator, 350_000n, 150_000n, 7000, 9n);
  await payment(c, "lifecycle/arbitrate/4", ref, "resolveDispute", 4, arbitrator, 0n, 600_000n, 0, 9n);
  await payment(c, "lifecycle/arbitrate/5", ref, "resolveDispute", 5, arbitrator, 700_000n, 0n, 10000, 9n);
  await rejection(c, "lifecycle/reject-repeat-arbitration", ref, () => c.settle("lifecycle/reject-repeat-arbitration", ref, "resolveDispute", 3, arbitrator, 7000, "InvalidMilestoneState"));
  c.journal.check("lifecycle-immediate-paths", await c.conserved(ref, 9n));
}

export async function refundWhenDue(c: DevnetClient) {
  const ref = c.journal.state.projects.lifecycle;
  if (c.journal.state.checks["lifecycle/refund/2"]) return true;
  if (await chainTime(c.env.connection) <= ref.deadlines[2]) return false;
  await rejection(c, "lifecycle/reject-late-delivery", ref, () => c.act("lifecycle/reject-late-delivery", ref, "submitDelivery", 2, c.env.seller, "DeadlinePassed"));
  await payment(c, "lifecycle/refund/2", ref, "refundOnDeadlineMiss", 2, c.env.buyer, 0n, 400_000n, 7000, 9n);
  return true;
}

export async function autoReleaseWhenDue(c: DevnetClient) {
  const ref = c.journal.state.projects.lifecycle;
  const schedule = c.journal.state.metadata.autoRelease as { unlockAt: number; submittedAt: string; windowSeconds: number };
  const now = await chainTime(c.env.connection);
  if (c.journal.state.checks["lifecycle-all-paths-completed"]) return { done: true, now, unlockAt: schedule.unlockAt, remainingSeconds: 0 };
  if (now < schedule.unlockAt) return { done: false, now, unlockAt: schedule.unlockAt, remainingSeconds: schedule.unlockAt - now };
  await refundWhenDue(c);
  await payment(c, "lifecycle/auto-release/1", ref, "claimAutoRelease", 1, c.env.seller, 300_000n, 0n, 7000, 9n);
  const after = await c.project(ref);
  assert.equal(status(after.status), "completed");
  assert.equal(after.sellerPaidAmount.toString(), "1550000"); assert.equal(after.buyerRefundedAmount.toString(), "1150000");
  await rejection(c, "lifecycle/reject-after-completion", ref, () => c.settle("lifecycle/reject-after-completion", ref, "claimAutoRelease", 1, c.env.seller, 7000, "NotFunded"));
  c.journal.check("lifecycle-all-paths-completed", { ...await c.conserved(ref, 9n), autoReleaseChainTime: now,
    submittedAt: schedule.submittedAt, elapsedSeconds: now - Number(schedule.submittedAt) });
  return { done: true, now, unlockAt: schedule.unlockAt, remainingSeconds: 0 };
}
