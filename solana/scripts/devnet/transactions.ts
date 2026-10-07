import assert from "node:assert/strict";
import { utils } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { delay, Environment } from "./environment";
import { Journal, TransactionRecord } from "./journal";

/** Persist the signed transaction before broadcasting; resume the same signature. */
export class Transactions {
  constructor(readonly env: Environment, readonly journal: Journal) {}

  async send(label: string, instructions: TransactionInstruction[], signers: Keypair[] = [], expectedError?: string) {
    let record = this.journal.state.transactions[label];
    if (record?.status === "passed") return record;
    if (record?.status === "unexpected_failure") throw new Error(`Inspect failed transaction ${label}: ${record.signature}`);
    if (!record) {
      const latest = await this.env.connection.getLatestBlockhash("confirmed");
      const memo = new TransactionInstruction({ programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), keys: [],
        data: Buffer.from(`SolPact:${this.journal.state.runId}:${label}`) });
      const tx = new Transaction({ feePayer: this.env.payer.publicKey, ...latest }).add(memo, ...instructions);
      const unique = [...new Map([this.env.payer, ...signers].map(s => [s.publicKey.toBase58(), s])).values()];
      tx.sign(...unique);
      const raw = tx.serialize(); assert.ok(raw.length <= 1232, `Packet too large: ${label}`);
      record = { signature: utils.bytes.bs58.encode(tx.signature!), status: "pending", ...latest,
        rawBase64: raw.toString("base64"), expectedError };
      this.journal.state.transactions[label] = record; this.journal.save();
    }
    const raw = Buffer.from(record.rawBase64, "base64");
    const status = (await this.env.connection.getSignatureStatuses([record.signature], { searchTransactionHistory: true })).value[0];
    if (!status) {
      assert.ok(await this.env.connection.getBlockHeight("confirmed") <= record.lastValidBlockHeight,
        `Expired unconfirmed transaction ${label}; reconcile its accounts before replacing it`);
      try { await this.env.connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 5 }); }
      catch { console.log(`Broadcast response uncertain; checking recorded signature for ${label}`); }
    }
    await this.confirm(label, record);
    console.log(`TX ${label} ${record.signature}${record.observedError ? ` (expected ${record.observedError})` : ""}`);
    return record;
  }

  private async confirm(label: string, record: TransactionRecord) {
    for (let attempt = 0; attempt < 120; attempt++) {
      const status = (await this.env.connection.getSignatureStatuses([record.signature], { searchTransactionHistory: true })).value[0];
      if (status && ["confirmed", "finalized"].includes(status.confirmationStatus ?? "")) {
        const result = await this.env.connection.getTransaction(record.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
        if (!result?.meta) { await delay(1000); continue; }
        const logs = result.meta.logMessages ?? [];
        const error = logs.join("\n").match(/Error Code: ([A-Za-z0-9_]+)\./)?.[1]
          ?? (result.meta.err ? JSON.stringify(result.meta.err) : undefined);
        Object.assign(record, { slot: result.slot, blockTime: result.blockTime,
          feeLamports: result.meta.fee, logs, observedError: error });
        const expected = record.expectedError;
        const passed = expected ? !!result.meta.err && error === expected : !result.meta.err;
        record.status = passed ? "passed" : "unexpected_failure"; this.journal.save();
        assert.ok(passed, `${label}: expected ${expected ?? "success"}, got ${error ?? "success"}\n${logs.join("\n")}`);
        return;
      }
      if (!status && await this.env.connection.getBlockHeight("confirmed") > record.lastValidBlockHeight) {
        throw new Error(`Transaction expired: ${label}. Reconcile ${record.signature} before retrying.`);
      }
      await delay(1500);
    }
    throw new Error(`Confirmation pending for ${label}: ${record.signature}; rerun to resume`);
  }
}
