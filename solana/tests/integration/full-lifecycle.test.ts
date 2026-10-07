import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { conserved, fails, status } from "../helpers/assertions";
import { START_TIME, USDC, WINDOW, ata } from "../helpers/pdas";

test("full lifecycle: create, fund, deliver, approve, auto release, refund and every arbitration split", async () => {
  const r = new Runtime(), c = new Client(r), initialBuyer = r.balance(ata(r.buyer.publicKey));
  const amounts = [200n, 300n, 400n, 500n, 600n, 700n].map(n => n * USDC);
  const total = amounts.reduce((a, b) => a + b, 0n);
  const ref = await c.draft({ count: amounts.length });
  for (const [index, amount] of amounts.entries()) await c.add(ref, index, amount, START_TIME + 7200n);
  await c.finalize(ref); await c.deposit(ref);
  r.mintTo(ref.vault, 9n); // unsolicited surplus is never given to the last payee
  conserved(r, c, ref, 9n);
  for (const index of [0, 1, 3, 4, 5]) await c.submit(ref, index, `ipfs://milestone-${index}`);
  await c.dispute(ref, 3); await c.dispute(ref, 4, ref.seller); await c.dispute(ref, 5);
  const receipts = [await c.settle(ref, "approveMilestone", ref.buyer, 0)];
  conserved(r, c, ref, 9n);
  for (const [index, bps] of [[3, 7000], [4, 0], [5, 10000]]) {
    receipts.push(await c.settle(ref, "resolveDispute", r.arbitrator, index, bps));
    conserved(r, c, ref, 9n);
  }
  r.setTime(START_TIME + WINDOW);
  receipts.push(await c.settle(ref, "claimAutoRelease", ref.seller, 1));
  conserved(r, c, ref, 9n);
  r.setTime(START_TIME + 7201n);
  receipts.push(await c.settle(ref, "refundOnDeadlineMiss", ref.buyer, 2));
  conserved(r, c, ref, 9n);
  const p = r.project(ref.address);
  assert.equal(status(p.status), "completed"); assert.equal(p.settledCount, 6);
  assert.equal(p.settledAmount.toString(), total.toString());
  assert.equal(r.balance(ata(ref.seller.publicKey)), 1550n * USDC);
  assert.equal(r.balance(ata(ref.buyer.publicKey)), initialBuyer - total + 1150n * USDC);
  assert.equal(r.balance(ref.vault), 9n);
  assert.deepEqual(amounts.map((_, i) => status(r.milestone(c.milestone(ref, i)).status)),
    ["approved", "approved", "refunded", "resolved", "resolved", "resolved"]);
  const events = receipts.flatMap(receipt => receipt.logs().filter(line => line.startsWith("Program data: "))
    .map(line => r.program.coder.events.decode(line.slice("Program data: ".length))));
  assert.equal(events.filter(e => e?.name === "milestoneSettled").length, 6);
  assert.equal(events.filter(e => e?.name === "projectCompleted").length, 1);
  fails(r.trySend([await c.depositIx(ref)], [ref.buyer]), "InvalidProjectState");
  fails(r.trySend([await c.settleIx(ref, "refundOnDeadlineMiss", ref.buyer, 2)], [ref.buyer]), "NotFunded");
  assert.ok(r.maxTransactionBytes <= 1232);

  // Cancellation is a separate unfunded lifecycle, never an escape from escrow.
  const cancelled = await c.draft(); await c.cancel(cancelled);
  assert.equal(status(r.project(cancelled.address).status), "cancelled");
});

test("20 milestones: resume a partial draft and complete in reverse order within packet limits", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.draft({ count: 20 });
  for (let i = 0; i < 10; i++) await c.add(ref, i, BigInt(i + 1), START_TIME + 7200n, "x".repeat(256));
  fails(r.trySend([await c.manageIx(ref, "finalizeProject")], [ref.buyer]), "IncompleteProject");
  // A new client recovers its next append index from chain state, not a global ID counter.
  const resumed = new Client(r);
  for (let i = r.project(ref.address).milestoneCount; i < 20; i++) {
    await resumed.add(ref, i, BigInt(i + 1), START_TIME + 7200n, "中".repeat(85));
  }
  await resumed.finalize(ref); await resumed.deposit(ref);
  assert.equal(r.balance(ref.vault), 210n);
  for (let i = 19; i >= 0; i--) {
    await resumed.submit(ref, i, "u".repeat(256));
    await resumed.settle(ref, "approveMilestone", ref.buyer, i);
    conserved(r, resumed, ref);
  }
  assert.equal(r.balance(ata(ref.seller.publicKey)), 210n);
  assert.equal(r.project(ref.address).settledCount, 20);
  assert.equal(status(r.project(ref.address).status), "completed");
  assert.ok(r.maxTransactionBytes <= 1232);
});
