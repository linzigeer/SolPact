import assert from "node:assert/strict";
import { test } from "node:test";
import { createFreezeAccountInstruction, createThawAccountInstruction } from "@solana/spl-token";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { conserved, fails, settlementAccounts, status } from "../helpers/assertions";
import { MINT, START_TIME, WINDOW, ata } from "../helpers/pdas";

test("raise_dispute accepts either party, rejects strangers and requires an arbitrator", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([100n, 200n]);
  fails(r.trySend([await c.actIx(ref, "raiseDispute")], [ref.buyer]), "InvalidMilestoneState");
  await c.submit(ref); await c.submit(ref, 1);
  fails(r.trySend([await c.actIx(ref, "raiseDispute", 0, r.stranger)], [r.stranger]), "Unauthorized");
  await c.dispute(ref); await c.dispute(ref, 1, ref.seller);
  assert.equal(status(r.milestone(c.milestone(ref)).status), "disputed");
  fails(r.trySend([await c.actIx(ref, "raiseDispute")], [ref.buyer]), "InvalidMilestoneState");
  const without = await c.funded([50n], { arbitrator: null }); await c.submit(without);
  fails(r.trySend([await c.actIx(without, "raiseDispute")], [without.buyer]), "NoArbitrator");
});

test("a dispute blocks approval, deadline refund and auto release", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded();
  await c.submit(ref); await c.dispute(ref); r.setTime(START_TIME + WINDOW + 10_000n);
  for (const [action, actor] of [["approveMilestone", ref.buyer], ["refundOnDeadlineMiss", ref.buyer], ["claimAutoRelease", ref.seller]] as const) {
    fails(r.trySend([await c.settleIx(ref, action, actor)], [actor]), "InvalidMilestoneState");
  }
  conserved(r, c, ref);
});

test("resolve_dispute verifies arbitrator and bounds before atomic split settlement", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([1000n, 100n]);
  fails(r.trySend([await c.settleIx(ref, "resolveDispute", r.arbitrator)], [r.arbitrator]), "InvalidMilestoneState");
  await c.submit(ref); await c.dispute(ref);
  fails(r.trySend([await c.settleIx(ref, "resolveDispute", r.stranger)], [r.stranger]), "Unauthorized");
  fails(r.trySend([await c.settleIx(ref, "resolveDispute", r.arbitrator, 0, 10001)], [r.arbitrator]), "InvalidBps");
  await c.settle(ref, "resolveDispute", r.arbitrator, 0, 7000);
  const m = r.milestone(c.milestone(ref));
  assert.equal(m.sellerPaid.toString(), "700"); assert.equal(m.buyerRefunded.toString(), "300");
  assert.equal(status(m.status), "resolved"); conserved(r, c, ref);
  fails(r.trySend([await c.settleIx(ref, "resolveDispute", r.arbitrator)], [r.arbitrator]), "InvalidMilestoneState");
});

test("resolve_dispute supports zero/full shares and returns rounding dust to buyer", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([10n, 10n, 3n]);
  const payouts = [[0, 0n, 10n], [10000, 10n, 0n], [3333, 0n, 3n]] as const;
  for (const [index, [bps, seller, buyer]] of payouts.entries()) {
    await c.submit(ref, index); await c.dispute(ref, index);
    await c.settle(ref, "resolveDispute", r.arbitrator, index, bps);
    const m = r.milestone(c.milestone(ref, index));
    assert.equal(m.sellerPaid.toString(), seller.toString());
    assert.equal(m.buyerRefunded.toString(), buyer.toString());
    assert.equal(status(m.status), "resolved"); conserved(r, c, ref);
  }
});

test("resolve_dispute rolls back its first payout when the second CPI fails", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([1000n]);
  await c.submit(ref); await c.dispute(ref);
  const buyerAta = ata(ref.buyer.publicKey);
  r.send([createFreezeAccountInstruction(buyerAta, MINT, r.payer.publicKey)]);
  const keys = settlementAccounts(r, c, ref), before = r.snapshot(keys);
  fails(r.trySend([await c.settleIx(ref, "resolveDispute", r.arbitrator, 0, 7000)], [r.arbitrator]), /frozen/i);
  assert.deepEqual(r.snapshot(keys), before);
  assert.equal(r.balance(ata(ref.seller.publicKey)), 0n);
  assert.equal(status(r.milestone(c.milestone(ref)).status), "disputed");
  r.send([createThawAccountInstruction(buyerAta, MINT, r.payer.publicKey)]);
  await c.settle(ref, "resolveDispute", r.arbitrator, 0, 7000);
  conserved(r, c, ref);
});
