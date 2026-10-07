import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { BN, Idl, IdlAccounts, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AccountLayout, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Solpact } from "../../target/types/solpact";
import idl from "../../target/idl/solpact.json";
import { Environment, MINT, PROGRAM_ID } from "./environment";
import { Journal, ProjectRecord } from "./journal";
import { Transactions } from "./transactions";

export const bn = (value: bigint | number | string) => new BN(value.toString());
export const ata = (owner: PublicKey) => getAssociatedTokenAddressSync(MINT, owner, true);
export const status = (value: object) => Object.keys(value)[0];
export type ProjectData = IdlAccounts<Solpact>["project"];
export type MilestoneData = IdlAccounts<Solpact>["milestone"];

export class DevnetClient {
  readonly program: Program;
  readonly tx: Transactions;
  constructor(readonly env: Environment, readonly journal: Journal) {
    this.program = new Program(idl as Idl, { connection: env.connection });
    this.tx = new Transactions(env, journal);
  }
  plan(name: string, amounts: bigint[], deadlines: number[], options: { buyer?: Keypair; arbitrator?: Keypair | null } = {}) {
    const existing = this.journal.state.projects[name]; if (existing) return existing;
    const id = randomBytes(16), buyer = options.buyer ?? this.env.buyer;
    const arbitrator = options.arbitrator === undefined ? this.env.arbitrator : options.arbitrator;
    const [address] = PublicKey.findProgramAddressSync([Buffer.from("project"), buyer.publicKey.toBuffer(), id], PROGRAM_ID);
    const record: ProjectRecord = { idHex: id.toString("hex"), address: address.toBase58(), vault: ata(address).toBase58(),
      amounts: amounts.map(String), deadlines, buyer: buyer.publicKey.toBase58(), seller: this.env.seller.publicKey.toBase58(),
      arbitrator: arbitrator?.publicKey.toBase58() ?? null, window: 3600 };
    this.journal.state.projects[name] = record; this.journal.save(); return record;
  }
  role(address: string): Keypair {
    const role = [this.env.payer, this.env.buyer, this.env.seller, this.env.arbitrator, this.env.stranger]
      .find(key => key.publicKey.toBase58() === address);
    assert.ok(role, `No signing key for ${address}`); return role;
  }
  milestone(ref: ProjectRecord, index: number) {
    return PublicKey.findProgramAddressSync([Buffer.from("milestone"), new PublicKey(ref.address).toBuffer(), Buffer.from([index])], PROGRAM_ID)[0];
  }
  ataIx(owner: PublicKey, payer = this.env.payer.publicKey) {
    return createAssociatedTokenAccountIdempotentInstruction(payer, ata(owner), owner, MINT);
  }
  ix(name: string, args: unknown[], accounts: Record<string, PublicKey>) {
    return this.program.methods[name](...args).accountsStrict(accounts).instruction();
  }
  async create(name: string, ref: ProjectRecord) {
    return this.tx.send(`${name}/create`, [this.ataIx(new PublicKey(ref.address), new PublicKey(ref.buyer)),
      await this.ix("createProject", [Array.from(Buffer.from(ref.idHex, "hex")), new PublicKey(ref.seller),
        ref.arbitrator ? new PublicKey(ref.arbitrator) : null, ref.amounts.length, bn(ref.window)], {
        buyer: new PublicKey(ref.buyer), project: new PublicKey(ref.address), mint: MINT,
        vault: new PublicKey(ref.vault), tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
      })], [this.role(ref.buyer)]);
  }
  async add(name: string, ref: ProjectRecord, index: number, description = `Devnet milestone ${index}`) {
    return this.tx.send(`${name}/add/${index}`, [await this.ix("addMilestone", [index, bn(ref.amounts[index]), bn(ref.deadlines[index]), description], {
      buyer: new PublicKey(ref.buyer), project: new PublicKey(ref.address), milestone: this.milestone(ref, index), systemProgram: SystemProgram.programId,
    })], [this.role(ref.buyer)]);
  }
  async manage(label: string, ref: ProjectRecord, method: "finalizeProject" | "cancelProject", expectedError?: string, actor = this.role(ref.buyer)) {
    return this.tx.send(label, [await this.ix(method, [], { buyer: actor.publicKey, project: new PublicKey(ref.address) })], [actor], expectedError);
  }
  async ready(name: string, ref: ProjectRecord) {
    await this.create(name, ref);
    for (let index = 0; index < ref.amounts.length; index++) await this.add(name, ref, index);
    await this.manage(`${name}/finalize`, ref, "finalizeProject");
  }
  async deposit(label: string, ref: ProjectRecord, expectedError?: string, actor = this.role(ref.buyer)) {
    return this.tx.send(label, [await this.ix("deposit", [], {
      buyer: actor.publicKey, project: new PublicKey(ref.address), mint: MINT, vault: new PublicKey(ref.vault),
      buyerAta: ata(new PublicKey(ref.buyer)), tokenProgram: TOKEN_PROGRAM_ID,
    })], [actor], expectedError);
  }
  async act(label: string, ref: ProjectRecord, method: "submitDelivery" | "raiseDispute", index: number, actor: Keypair,
    expectedError?: string, uri = `ipfs://solpact-devnet-${index}`) {
    return this.tx.send(label, [await this.ix(method, method === "submitDelivery" ? [uri] : [], {
      actor: actor.publicKey, project: new PublicKey(ref.address), milestone: this.milestone(ref, index),
    })], [actor], expectedError);
  }
  async settle(label: string, ref: ProjectRecord, method: string, index: number, actor: Keypair,
    bps = 7000, expectedError?: string, overrides: Record<string, PublicKey> = {}) {
    return this.tx.send(label, [await this.ix(method, method === "resolveDispute" ? [bps] : [], {
      actor: actor.publicKey, project: new PublicKey(ref.address), milestone: this.milestone(ref, index), mint: MINT,
      vault: new PublicKey(ref.vault), buyerAta: ata(new PublicKey(ref.buyer)), sellerAta: ata(new PublicKey(ref.seller)),
      tokenProgram: TOKEN_PROGRAM_ID, ...overrides,
    })], [actor], expectedError);
  }
  async project(ref: ProjectRecord): Promise<ProjectData> {
    const account = await this.env.connection.getAccountInfo(new PublicKey(ref.address), "confirmed");
    assert.ok(account); return this.program.coder.accounts.decode("project", account.data);
  }
  async item(ref: ProjectRecord, index: number): Promise<MilestoneData> {
    const account = await this.env.connection.getAccountInfo(this.milestone(ref, index), "confirmed");
    assert.ok(account); return this.program.coder.accounts.decode("milestone", account.data);
  }
  async balance(address: PublicKey) {
    const account = await this.env.connection.getAccountInfo(address, "confirmed");
    return account ? AccountLayout.decode(account.data).amount : 0n;
  }
  async conserved(ref: ProjectRecord, surplus = 0n) {
    const addresses = [new PublicKey(ref.address), new PublicKey(ref.vault), ...ref.amounts.map((_, i) => this.milestone(ref, i))];
    const accounts = await this.env.connection.getMultipleAccountsInfo(addresses, "confirmed");
    assert.ok(accounts.every(Boolean));
    const p = this.program.coder.accounts.decode<ProjectData>("project", accounts[0]!.data);
    let seller = 0n, buyer = 0n, count = 0;
    for (const account of accounts.slice(2)) {
      const m = this.program.coder.accounts.decode<MilestoneData>("milestone", account!.data);
      const paid = BigInt(m.sellerPaid.toString()), refund = BigInt(m.buyerRefunded.toString());
      if (["approved", "refunded", "resolved"].includes(status(m.status))) { assert.equal(paid + refund, BigInt(m.amount.toString())); count++; }
      else assert.equal(paid + refund, 0n);
      seller += paid; buyer += refund;
    }
    assert.equal(p.sellerPaidAmount.toString(), seller.toString());
    assert.equal(p.buyerRefundedAmount.toString(), buyer.toString());
    assert.equal(p.settledAmount.toString(), (seller + buyer).toString()); assert.equal(p.settledCount, count);
    const vault = AccountLayout.decode(accounts[1]!.data).amount;
    assert.equal(vault, BigInt(p.totalAmount.toString()) - seller - buyer + surplus);
    assert.equal(status(p.status), count === ref.amounts.length ? "completed" : "funded");
    return { project: ref.address, status: status(p.status), totalBaseUnits: p.totalAmount.toString(),
      settledCount: count, sellerPaidBaseUnits: seller.toString(), buyerRefundBaseUnits: buyer.toString(), vaultBaseUnits: vault.toString() };
  }
}
