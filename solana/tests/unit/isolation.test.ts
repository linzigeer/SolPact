import assert from "node:assert/strict";
import { test } from "node:test";
import { PublicKey, SystemProgram, VersionedTransaction } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Client } from "../helpers/client";
import { Runtime } from "../helpers/runtime";
import { fails, status } from "../helpers/assertions";
import { START_TIME, ata } from "../helpers/pdas";

test("regression: unfunded B cannot refund honest A's tokens", async () => {
  const r = new Runtime(), c = new Client(r), honest = await c.funded([1000n]);
  const unfunded = await c.ready([1000n], { buyer: r.stranger }, START_TIME + 1n);
  r.setTime(START_TIME + 2n);
  fails(r.trySend([await c.settleIx(unfunded, "refundOnDeadlineMiss", r.stranger)], [r.stranger]), "NotFunded");
  fails(r.trySend([await c.settleIx(unfunded, "refundOnDeadlineMiss", r.stranger, 0, 0, { vault: honest.vault })], [r.stranger]));
  assert.equal(r.balance(honest.vault), 1000n); assert.equal(r.balance(unfunded.vault), 0n);
  assert.equal(r.balance(ata(r.stranger.publicKey)), 0n);
  assert.equal(status(r.project(honest.address).status), "funded");
});

test("funded projects reject exchanged vaults and milestone accounts", async () => {
  const r = new Runtime(), c = new Client(r), a = await c.funded(), b = await c.funded();
  await c.submit(a); await c.submit(b);
  const before = r.snapshot([a.address, b.address, a.vault, b.vault]);
  fails(r.trySend([await c.settleIx(a, "approveMilestone", a.buyer, 0, 0, { vault: b.vault })], [a.buyer]), "InvalidVault");
  fails(r.trySend([await c.settleIx(a, "approveMilestone", a.buyer, 0, 0, { milestone: c.milestone(b) })], [a.buyer]), /ConstraintSeeds|ConstraintHasOne/);
  assert.deepEqual(r.snapshot([a.address, b.address, a.vault, b.vault]), before);
});

test("settlement rejects substituted recipients, aliased accounts and Token-2022", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded(); await c.submit(ref);
  const badAccounts: Record<string, PublicKey>[] = [
    { sellerAta: ata(r.stranger.publicKey) }, { buyerAta: ata(r.stranger.publicKey) },
    { sellerAta: ata(ref.buyer.publicKey) }, { sellerAta: ref.vault },
    { tokenProgram: TOKEN_2022_PROGRAM_ID }, { tokenProgram: SystemProgram.programId },
  ];
  for (const overrides of badAccounts) {
    fails(r.trySend([await c.settleIx(ref, "approveMilestone", ref.buyer, 0, 0, overrides)], [ref.buyer]));
    assert.equal(r.balance(ref.vault), 100n);
  }
});

test("a public key without its signature cannot authorize an instruction", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded(); await c.submit(ref);
  const ix = await c.settleIx(ref, "approveMilestone", ref.buyer);
  const incomplete = new VersionedTransaction(r.transaction([ix]).compileMessage());
  incomplete.sign([r.payer]);
  fails(r.svm.sendTransaction(incomplete), /SignatureFailure|signature/i);
  // Even if the caller strips signer metadata, Anchor's Signer rejects it.
  for (const meta of ix.keys) if (meta.pubkey.equals(ref.buyer.publicKey)) meta.isSigner = false;
  fails(r.trySend([ix]), /AccountNotSigner/);
  assert.equal(r.balance(ref.vault), 100n);
});

test("program ownership, discriminator and schema version are checked", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded();
  const original = r.svm.getAccount(ref.address)!;
  // These fixtures emulate forged/obsolete accounts, not a valid update path.
  r.svm.setAccount(ref.address, { ...original, owner: SystemProgram.programId });
  fails(r.trySend([await c.actIx(ref, "submitDelivery")], [ref.seller]), /AccountOwnedByWrongProgram/);
  const badDiscriminator = Buffer.from(original.data); badDiscriminator[0] ^= 0xff;
  r.svm.setAccount(ref.address, { ...original, data: badDiscriminator });
  fails(r.trySend([await c.actIx(ref, "submitDelivery")], [ref.seller]), /AccountDiscriminatorMismatch/);
  const badVersion = Buffer.from(original.data); badVersion[8] = 2;
  r.svm.setAccount(ref.address, { ...original, data: badVersion });
  fails(r.trySend([await c.actIx(ref, "submitDelivery")], [ref.seller]), "InvalidVersion");
  r.svm.setAccount(ref.address, original);
  await c.submit(ref);
});

test("forged PDA and a foreign mint are rejected despite valid serialized types", async () => {
  const r = new Runtime(), c = new Client(r), ref = await c.funded();
  const fake = PublicKey.unique(); r.svm.setAccount(fake, r.svm.getAccount(ref.address)!);
  fails(r.trySend([await c.actIx(ref, "submitDelivery", 0, ref.seller, "uri", { project: fake })], [ref.seller]), /ConstraintSeeds/);
  const mint = PublicKey.unique(); r.installMint(mint);
  await c.submit(ref);
  fails(r.trySend([await c.settleIx(ref, "approveMilestone", ref.buyer, 0, 0, { mint })], [ref.buyer]), "InvalidMint");
});
