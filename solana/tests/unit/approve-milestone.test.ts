import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { conserved, fails, status } from "../helpers/assertions";
import { ata } from "../helpers/pdas";

test("approve_milestone pays only the recorded seller and rejects repeat settlement", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([700n, 300n]);
  fails(r.trySend([await c.settleIx(ref, "approveMilestone", ref.buyer)], [ref.buyer]), "InvalidMilestoneState");
  await c.submit(ref);
  fails(r.trySend([await c.settleIx(ref, "approveMilestone", ref.seller)], [ref.seller]), "Unauthorized");
  await c.settle(ref, "approveMilestone", ref.buyer);
  assert.equal(r.balance(ata(ref.seller.publicKey)), 700n);
  assert.equal(status(r.milestone(c.milestone(ref)).status), "approved");
  conserved(r, c, ref);
  fails(r.trySend([await c.settleIx(ref, "approveMilestone", ref.buyer)], [ref.buyer]), "InvalidMilestoneState");
});

test("approve_milestone completes a one-milestone project with exact balances", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([99n]);
  await c.submit(ref); await c.settle(ref, "approveMilestone", ref.buyer);
  assert.equal(r.balance(ref.vault), 0n); conserved(r, c, ref);
  fails(r.trySend([await c.settleIx(ref, "approveMilestone", ref.buyer)], [ref.buyer]), "NotFunded");
});
