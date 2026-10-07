import assert from "node:assert/strict";
import { test } from "node:test";
import { PublicKey } from "@solana/web3.js";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { fails, status } from "../helpers/assertions";
import { MINT, projectPda } from "../helpers/pdas";

test("create_project initializes a versioned draft and canonical isolated vault", async () => {
  const r = new Runtime(), c = new Client(r);
  const ref = await c.draft({ count: 20 });
  const p = r.project(ref.address);
  assert.equal(status(p.status), "draft");
  assert.equal(p.expectedMilestones, 20); assert.equal(p.milestoneCount, 0);
  assert.equal(p.version, 1); assert.equal(p.totalAmount.toString(), "0");
  assert.ok(p.buyer.equals(ref.buyer.publicKey) && p.seller.equals(ref.seller.publicKey));
  assert.ok(p.mint.equals(MINT) && p.vault.equals(ref.vault));
  assert.equal(p.bump, projectPda(ref.buyer.publicKey, ref.id)[1]);
  assert.equal(r.data(ref.address).length, 247);
  assert.equal(r.balance(ref.vault), 0n);
});

test("create_project accepts no arbitrator and pre-existing donated vault", async () => {
  const r = new Runtime(), c = new Client(r);
  const { ref, instruction } = await c.draftInstruction({ arbitrator: null });
  r.send([r.ataInstruction(ref.address)]); r.mintTo(ref.vault, 5n);
  r.send([r.ataInstruction(ref.address), instruction], [ref.buyer]);
  assert.equal(r.project(ref.address).arbitrator, null);
  assert.equal(r.balance(ref.vault), 5n);
  assert.equal(status(r.project(ref.address).status), "draft");
});

test("create_project rejects duplicate project IDs without overwriting data", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.draft();
  const before = r.data(ref.address);
  const { instruction } = await c.draftInstruction({ id: ref.id });
  fails(r.trySend([instruction], [ref.buyer]), /already in use|already initialized/i);
  assert.deepEqual(r.data(ref.address), before);
});

test("create_project rejects invalid count, window and self-arbitration", async () => {
  const r = new Runtime(), c = new Client(r);
  const cases = [
    [{ count: 0 }, "InvalidMilestoneCount"], [{ count: 21 }, "InvalidMilestoneCount"],
    [{ window: 3599n }, "InvalidWindow"], [{ window: 7_776_001n }, "InvalidWindow"],
    [{ seller: r.buyer }, "InvalidRole"], [{ arbitrator: r.buyer }, "InvalidRole"],
    [{ arbitrator: r.seller }, "InvalidRole"],
  ] as const;
  for (const [options, error] of cases) {
    const { ref, instruction } = await c.draftInstruction(options);
    fails(r.trySend([r.ataInstruction(ref.address), instruction], [ref.buyer]), error);
    assert.equal(r.svm.getAccount(ref.address), null);
    assert.equal(r.svm.getAccount(ref.vault), null);
  }
});

test("create_project rejects an unsupported mint even with six decimals", async () => {
  const r = new Runtime(), c = new Client(r);
  const { ref, instruction } = await c.draftInstruction();
  const fake = PublicKey.unique(); r.installMint(fake);
  for (const key of instruction.keys) if (key.pubkey.equals(MINT)) key.pubkey = fake;
  fails(r.trySend([r.ataInstruction(ref.address), instruction], [ref.buyer]), "InvalidMint");
});
