import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { fails, status } from "../helpers/assertions";
import { START_TIME } from "../helpers/pdas";

test("submit_delivery requires seller and records evidence at the deadline", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded([100n], {}, START_TIME + 10n);
  fails(r.trySend([await c.actIx(ref, "submitDelivery", 0, r.buyer)], [r.buyer]), "Unauthorized");
  r.setTime(START_TIME + 10n); await c.submit(ref, 0, "x".repeat(256));
  const m = r.milestone(c.milestone(ref));
  assert.equal(status(m.status), "submitted"); assert.equal(m.deliverableUri.length, 256);
  assert.equal(m.submittedAt.toString(), (START_TIME + 10n).toString());
  fails(r.trySend([await c.actIx(ref, "submitDelivery")], [ref.seller]), "InvalidMilestoneState");
});

test("submit_delivery rejects unfunded projects, invalid text and late delivery", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.ready([100n], {}, START_TIME + 10n);
  fails(r.trySend([await c.actIx(ref, "submitDelivery")], [ref.seller]), "NotFunded");
  await c.deposit(ref);
  for (const [uri, error] of [["", "EmptyUri"], [" ", "EmptyUri"], ["中".repeat(86), "TextTooLong"]]) {
    fails(r.trySend([await c.actIx(ref, "submitDelivery", 0, ref.seller, uri)], [ref.seller]), error);
  }
  r.setTime(START_TIME + 11n);
  fails(r.trySend([await c.actIx(ref, "submitDelivery")], [ref.seller]), "DeadlinePassed");
  assert.equal(status(r.milestone(c.milestone(ref)).status), "pending");
});
