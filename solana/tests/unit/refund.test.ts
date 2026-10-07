import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { conserved, fails, status } from "../helpers/assertions";
import { START_TIME, ata } from "../helpers/pdas";

test("refund_on_deadline_miss requires buyer and strictly exceeds the deadline", async () => {
  const r = new Runtime(), c = new Client(r), before = r.balance(ata(r.buyer.publicKey));
  const ref = await c.funded([100n], {}, START_TIME + 10n);
  r.setTime(START_TIME + 10n);
  fails(r.trySend([await c.settleIx(ref, "refundOnDeadlineMiss", ref.buyer)], [ref.buyer]), "NotOverdue");
  r.setTime(START_TIME + 11n);
  fails(r.trySend([await c.settleIx(ref, "refundOnDeadlineMiss", ref.seller)], [ref.seller]), "Unauthorized");
  await c.settle(ref, "refundOnDeadlineMiss", ref.buyer);
  assert.equal(r.balance(ata(ref.buyer.publicKey)), before);
  assert.equal(status(r.milestone(c.milestone(ref)).status), "refunded"); conserved(r, c, ref);
  fails(r.trySend([await c.settleIx(ref, "refundOnDeadlineMiss", ref.buyer)], [ref.buyer]), "NotFunded");
});

test("refund_on_deadline_miss cannot refund a delivery submitted before the deadline", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([100n], {}, START_TIME + 10n);
  await c.submit(ref); r.setTime(START_TIME + 11n);
  fails(r.trySend([await c.settleIx(ref, "refundOnDeadlineMiss", ref.buyer)], [ref.buyer]), "InvalidMilestoneState");
  assert.equal(r.balance(ref.vault), 100n);
});
