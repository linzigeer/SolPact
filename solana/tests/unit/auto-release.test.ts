import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { conserved, fails, status } from "../helpers/assertions";
import { START_TIME, WINDOW, ata } from "../helpers/pdas";

test("claim_auto_release requires seller and permits the exact unlock second", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded(); await c.submit(ref);
  r.setTime(START_TIME + WINDOW - 1n);
  fails(r.trySend([await c.settleIx(ref, "claimAutoRelease", ref.seller)], [ref.seller]), "TooEarly");
  fails(r.trySend([await c.settleIx(ref, "claimAutoRelease", ref.buyer)], [ref.buyer]), "Unauthorized");
  r.setTime(START_TIME + WINDOW);
  // Reaching the time boundary alone does not execute a transfer.
  assert.equal(status(r.milestone(c.milestone(ref)).status), "submitted");
  assert.equal(r.balance(ata(ref.seller.publicKey)), 0n);
  await c.settle(ref, "claimAutoRelease", ref.seller);
  assert.equal(r.balance(ata(ref.seller.publicKey)), 100n); conserved(r, c, ref);
  fails(r.trySend([await c.settleIx(ref, "claimAutoRelease", ref.seller)], [ref.seller]), "NotFunded");
});

test("claim_auto_release stays blocked if a dispute wins after the unlock time", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded(); await c.submit(ref);
  r.setTime(START_TIME + WINDOW + 1n); await c.dispute(ref);
  fails(r.trySend([await c.settleIx(ref, "claimAutoRelease", ref.seller)], [ref.seller]), "InvalidMilestoneState");
  assert.equal(r.balance(ref.vault), 100n);
});
