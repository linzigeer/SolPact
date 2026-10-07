import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BN, Idl, IdlAccounts, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createMintToInstruction } from "@solana/spl-token";
import { Clock, FailedTransactionMetadata, LiteSVM, TransactionMetadata } from "litesvm";
import type { Solpact } from "../../target/types/solpact";
import { ata, MINT, PROGRAM_ID, START_TIME, USDC } from "./pdas";

export const bn = (value: bigint | number) => new BN(value.toString());
export type ProjectData = IdlAccounts<Solpact>["project"];
export type MilestoneData = IdlAccounts<Solpact>["milestone"];

/** Fresh VM for each test. No RPC, real wallet or live-chain transaction is used. */
export class Runtime {
  readonly svm = new LiteSVM();
  readonly payer = Keypair.generate();
  readonly buyer = Keypair.generate();
  readonly seller = Keypair.generate();
  readonly arbitrator = Keypair.generate();
  readonly stranger = Keypair.generate();
  readonly program: Program;
  maxTransactionBytes = 0;

  constructor() {
    const idl = JSON.parse(readFileSync(resolve("target/idl/solpact.json"), "utf8")) as Idl;
    assert.equal(idl.address, PROGRAM_ID.toBase58());
    // Connection is only used by Anchor's instruction builder; no RPC methods run.
    this.program = new Program(idl, { connection: new Connection("http://127.0.0.1:8899") });
    this.svm.addProgramFromFile(PROGRAM_ID, resolve("target/deploy/solpact.so"));
    this.setTime(START_TIME);
    for (const signer of [this.payer, this.buyer, this.seller, this.arbitrator, this.stranger]) {
      const result = this.svm.airdrop(signer.publicKey, 100_000_000_000n);
      assert.ok(!(result instanceof FailedTransactionMetadata));
    }
    this.installMint(MINT);
    this.send([this.ataInstruction(this.buyer.publicKey), this.ataInstruction(this.seller.publicKey), this.ataInstruction(this.stranger.publicKey)]);
    this.mintTo(ata(this.buyer.publicKey), 100_000n * USDC);
  }

  /** Genesis fixture only: this is not Circle USDC and has no real value. */
  installMint(address: PublicKey, decimals = 6) {
    const data = Buffer.alloc(MintLayout.span);
    MintLayout.encode({ mintAuthorityOption: 1, mintAuthority: this.payer.publicKey,
      supply: 0n, decimals, isInitialized: true, freezeAuthorityOption: 1,
      freezeAuthority: this.payer.publicKey }, data);
    this.svm.setAccount(address, { data, executable: false, owner: TOKEN_PROGRAM_ID,
      lamports: Number(this.svm.minimumBalanceForRentExemption(BigInt(data.length))) });
  }

  ataInstruction(owner: PublicKey, payer = this.payer.publicKey, mint = MINT) {
    return createAssociatedTokenAccountIdempotentInstruction(payer, ata(owner, mint), owner, mint);
  }

  mintTo(destination: PublicKey, amount: bigint) {
    return this.send([createMintToInstruction(MINT, destination, this.payer.publicKey, amount)]);
  }

  setTime(time: bigint) {
    const c = this.svm.getClock();
    this.svm.setClock(new Clock(c.slot, c.epochStartTimestamp, c.epoch, c.leaderScheduleEpoch, time));
    assert.equal(this.svm.getClock().unixTimestamp, time);
  }

  async ix(name: string, args: unknown[], accounts: Record<string, PublicKey>) {
    return this.program.methods[name](...args).accountsStrict(accounts).instruction();
  }

  transaction(instructions: TransactionInstruction[], signers: Keypair[] = [], feePayer = this.payer) {
    this.svm.expireBlockhash();
    const tx = new Transaction({ feePayer: feePayer.publicKey, recentBlockhash: this.svm.latestBlockhash() }).add(...instructions);
    const unique = [...new Map([feePayer, ...signers].map(s => [s.publicKey.toBase58(), s])).values()];
    tx.partialSign(...unique);
    const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length;
    assert.ok(bytes <= 1232, `Transaction exceeds legacy packet budget: ${bytes}`);
    this.maxTransactionBytes = Math.max(this.maxTransactionBytes, bytes);
    return tx;
  }

  trySend(instructions: TransactionInstruction[], signers: Keypair[] = [], feePayer = this.payer) {
    return this.svm.sendTransaction(this.transaction(instructions, signers, feePayer));
  }

  send(instructions: TransactionInstruction[], signers: Keypair[] = [], feePayer = this.payer): TransactionMetadata {
    const result = this.trySend(instructions, signers, feePayer);
    if (result instanceof FailedTransactionMetadata) {
      throw new Error(`${result.toString()}\n${result.meta().logs().join("\n")}`);
    }
    return result;
  }

  project(address: PublicKey): ProjectData {
    return this.program.coder.accounts.decode("project", this.data(address));
  }
  milestone(address: PublicKey): MilestoneData {
    return this.program.coder.accounts.decode("milestone", this.data(address));
  }
  data(address: PublicKey): Buffer {
    const account = this.svm.getAccount(address);
    assert.ok(account, `Missing account ${address.toBase58()}`);
    return Buffer.from(account.data);
  }
  balance(address: PublicKey): bigint {
    return AccountLayout.decode(this.data(address)).amount;
  }
  snapshot(addresses: PublicKey[]) {
    return addresses.map(address => this.data(address).toString("hex"));
  }
}
