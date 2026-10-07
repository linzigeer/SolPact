import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { fails } from "../helpers/assertions";
import { START_TIME, milestonePda } from "../helpers/pdas";

test("add_milestone accumulates totals, allocates maximum text and uses byte index seeds", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.draft({ count: 2 });
  await c.add(ref, 0, 100n, START_TIME + 100n, "x".repeat(256));
  await c.add(ref, 1, 300n, START_TIME + 50n, "中".repeat(85));
  const p = r.project(ref.address), m = r.milestone(c.milestone(ref, 1));
  assert.equal(p.totalAmount.toString(), "400"); assert.equal(p.milestoneCount, 2);
  assert.equal(p.minDeadline.toString(), (START_TIME + 50n).toString());
  assert.ok(m.project.equals(ref.address)); assert.equal(m.index, 1);
  assert.equal(m.bump, milestonePda(ref.address, 1)[1]);
  assert.equal(r.data(c.milestone(ref, 0)).length, 604);
});

test("add_milestone rejects gaps, zero amounts, past deadlines and oversized UTF-8", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.draft();
  for (const [index, amount, deadline, description, error] of [
    [1, 1n, START_TIME + 1n, "x", "InvalidIndex"],
    [0, 0n, START_TIME + 1n, "x", "ZeroAmount"],
    [0, 1n, START_TIME, "x", "DeadlinePassed"],
    [0, 1n, START_TIME + 1n, "中".repeat(86), "TextTooLong"],
  ] as const) {
    fails(r.trySend([await c.addIx(ref, index, amount, deadline, description)], [ref.buyer]), error);
    assert.equal(r.project(ref.address).milestoneCount, 0);
    assert.equal(r.svm.getAccount(c.milestone(ref, index)), null);
  }
});

test("add_milestone rejects duplicate indices, overflow and changes after finalization", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.draft({ count: 2 });
  await c.add(ref, 0, (1n << 64n) - 1n);
  fails(r.trySend([await c.addIx(ref, 0, 1n)], [ref.buyer]), /already in use|already initialized/i);
  fails(r.trySend([await c.addIx(ref, 1, 1n)], [ref.buyer]), "MathOverflow");
  assert.equal(r.project(ref.address).milestoneCount, 1);
  const other = await c.ready();
  fails(r.trySend([await c.addIx(other, 1, 1n)], [other.buyer]), "InvalidProjectState");
});
