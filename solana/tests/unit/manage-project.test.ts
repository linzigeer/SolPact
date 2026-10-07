import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { fails, status } from "../helpers/assertions";
import { START_TIME } from "../helpers/pdas";

test("finalize_project requires all milestones and a future minimum deadline", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.draft();
  fails(r.trySend([await c.manageIx(ref, "finalizeProject")], [ref.buyer]), "IncompleteProject");
  await c.add(ref, 0, 100n, START_TIME + 10n);
  r.setTime(START_TIME + 10n);
  fails(r.trySend([await c.manageIx(ref, "finalizeProject")], [ref.buyer]), "DeadlinePassed");
  assert.equal(status(r.project(ref.address).status), "draft");
});

test("finalize_project freezes completed terms and rejects non-buyers", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.draft(); await c.add(ref, 0, 100n);
  fails(r.trySend([await c.manageIx(ref, "finalizeProject", r.stranger)], [r.stranger]), "Unauthorized");
  await c.finalize(ref); assert.equal(status(r.project(ref.address).status), "created");
  fails(r.trySend([await c.manageIx(ref, "finalizeProject")], [ref.buyer]), "InvalidProjectState");
});

test("cancel_project cancels drafts and created projects without deleting history", async () => {
  const r = new Runtime(), c = new Client(r);
  for (const ref of [await c.draft(), await c.ready()]) {
    fails(r.trySend([await c.manageIx(ref, "cancelProject", r.stranger)], [r.stranger]), "Unauthorized");
    await c.cancel(ref); assert.equal(status(r.project(ref.address).status), "cancelled");
    assert.ok(r.svm.getAccount(ref.vault));
    fails(r.trySend([await c.manageIx(ref, "cancelProject")], [ref.buyer]), "InvalidProjectState");
    fails(r.trySend([await c.depositIx(ref)], [ref.buyer]), "InvalidProjectState");
  }
});

test("cancel_project cannot cancel a funded project", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded();
  const before = r.snapshot([ref.address, ref.vault]);
  fails(r.trySend([await c.manageIx(ref, "cancelProject")], [ref.buyer]), "InvalidProjectState");
  assert.deepEqual(r.snapshot([ref.address, ref.vault]), before);
});
