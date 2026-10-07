import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { fails, status } from "../helpers/assertions";
import { START_TIME, USDC, ata } from "../helpers/pdas";

test("deposit transfers exactly the total, ignores donations and cannot repeat", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.ready([300n, 700n]);
  r.mintTo(ref.vault, 7n);
  const before = r.balance(ata(ref.buyer.publicKey));
  await c.deposit(ref);
  assert.equal(r.balance(ref.vault), 1007n);
  assert.equal(r.balance(ata(ref.buyer.publicKey)), before - 1000n);
  assert.equal(status(r.project(ref.address).status), "funded");
  fails(r.trySend([await c.depositIx(ref)], [ref.buyer]), "InvalidProjectState");
});

test("deposit rejects non-buyers, drafts and deadlines reached before funding", async () => {
  const r = new Runtime(), c = new Client(r), draft = await c.draft();
  fails(r.trySend([await c.depositIx(draft)], [draft.buyer]), "InvalidProjectState");
  const ref = await c.ready([100n], {}, START_TIME + 10n);
  fails(r.trySend([await c.depositIx(ref, { buyer: r.stranger.publicKey })], [r.stranger]), "Unauthorized");
  r.setTime(START_TIME + 10n);
  fails(r.trySend([await c.depositIx(ref)], [ref.buyer]), "DeadlinePassed");
  assert.equal(r.balance(ref.vault), 0n);
});

test("deposit with insufficient tokens rolls back the funded state", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.ready([100_001n * USDC]);
  const keys = [ref.address, ref.vault, ata(ref.buyer.publicKey)], before = r.snapshot(keys);
  fails(r.trySend([await c.depositIx(ref)], [ref.buyer]), /insufficient funds/i);
  assert.deepEqual(r.snapshot(keys), before);
  assert.equal(status(r.project(ref.address).status), "created");
});
