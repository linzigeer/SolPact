import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import { ata, DevnetClient } from "./client";
import { hash } from "./environment";
import { ProjectRecord, TransactionRecord } from "./journal";

export async function accountSnapshot(c: DevnetClient, ref: ProjectRecord) {
  const addresses = [new PublicKey(ref.address), new PublicKey(ref.vault), ata(new PublicKey(ref.buyer)), ata(new PublicKey(ref.seller)),
    ...ref.amounts.map((_, i) => c.milestone(ref, i))];
  const accounts = await c.env.connection.getMultipleAccountsInfo(addresses, "confirmed");
  return accounts.map((account, i) => ({ address: addresses[i].toBase58(), dataHash: account ? hash(account.data) : null,
    owner: account?.owner.toBase58() ?? null, lamports: account?.lamports ?? null }));
}

/** Record before-values once, including when resuming after a submitted transaction. */
export async function rejection(c: DevnetClient, label: string, ref: ProjectRecord, action: () => Promise<TransactionRecord>) {
  if (c.journal.state.checks[label]) return;
  const key = `before/${label}`;
  if (!c.journal.state.metadata[key]) { c.journal.state.metadata[key] = await accountSnapshot(c, ref); c.journal.save(); }
  const result = await action();
  assert.ok(result.observedError, `${label} did not fail on-chain`);
  assert.deepEqual(await accountSnapshot(c, ref), c.journal.state.metadata[key], `${label} changed protected accounts`);
  c.journal.check(label, { signature: result.signature, error: result.observedError, protectedAccountsUnchanged: true });
}

export async function payment(c: DevnetClient, label: string, ref: ProjectRecord, method: string,
  index: number, actor: Keypair, seller: bigint, buyer: bigint, bps = 7000, surplus = 0n) {
  if (c.journal.state.checks[label]) return;
  const key = `before/${label}`;
  if (!c.journal.state.metadata[key]) {
    const [sellerBefore, buyerBefore] = await Promise.all([c.balance(ata(new PublicKey(ref.seller))), c.balance(ata(new PublicKey(ref.buyer)))]);
    c.journal.state.metadata[key] = { seller: sellerBefore.toString(), buyer: buyerBefore.toString() }; c.journal.save();
  }
  const result = await c.settle(label, ref, method, index, actor, bps);
  const before = c.journal.state.metadata[key] as { seller: string; buyer: string };
  const [sellerAfter, buyerAfter] = await Promise.all([c.balance(ata(new PublicKey(ref.seller))), c.balance(ata(new PublicKey(ref.buyer)))]);
  assert.equal(sellerAfter - BigInt(before.seller), seller);
  assert.equal(buyerAfter - BigInt(before.buyer), buyer);
  c.journal.check(label, { signature: result.signature, sellerDeltaBaseUnits: seller.toString(), buyerDeltaBaseUnits: buyer.toString(),
    accounting: await c.conserved(ref, surplus) });
}
