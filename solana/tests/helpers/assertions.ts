import assert from "node:assert/strict";
import { FailedTransactionMetadata, TransactionMetadata } from "litesvm";
import { Runtime } from "./runtime";
import { ProjectRef, Client } from "./client";
import { ata } from "./pdas";

export function fails(result: TransactionMetadata | FailedTransactionMetadata, error?: string | RegExp) {
  assert.ok(result instanceof FailedTransactionMetadata, "Expected a rejected transaction");
  const text = `${result.toString()}\n${result.meta().logs().join("\n")}`;
  if (typeof error === "string") assert.ok(text.includes(`Error Code: ${error}.`), `Expected ${error}:\n${text}`);
  else if (error) assert.match(text, error);
  return result;
}

export function status(value: object) { return Object.keys(value)[0]; }

export function conserved(r: Runtime, c: Client, ref: ProjectRef, surplus = 0n) {
  const p = r.project(ref.address);
  let seller = 0n, buyer = 0n, count = 0;
  for (let index = 0; index < p.milestoneCount; index++) {
    const m = r.milestone(c.milestone(ref, index));
    const paid = BigInt(m.sellerPaid.toString()), refunded = BigInt(m.buyerRefunded.toString());
    if (["approved", "refunded", "resolved"].includes(status(m.status))) {
      assert.equal(paid + refunded, BigInt(m.amount.toString())); count++;
    } else { assert.equal(paid + refunded, 0n); }
    seller += paid; buyer += refunded;
  }
  assert.equal(seller, BigInt(p.sellerPaidAmount.toString()));
  assert.equal(buyer, BigInt(p.buyerRefundedAmount.toString()));
  assert.equal(seller + buyer, BigInt(p.settledAmount.toString()));
  assert.equal(p.settledCount, count);
  assert.equal(r.balance(ref.vault), BigInt(p.totalAmount.toString()) - seller - buyer + surplus);
  assert.equal(status(p.status), count === p.milestoneCount ? "completed" : "funded");
}

export function settlementAccounts(r: Runtime, c: Client, ref: ProjectRef, index = 0) {
  return [ref.address, c.milestone(ref, index), ref.vault, ata(ref.buyer.publicKey), ata(ref.seller.publicKey)];
}
