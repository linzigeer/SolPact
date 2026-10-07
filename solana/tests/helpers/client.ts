import { randomBytes } from "node:crypto";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Runtime, bn } from "./runtime";
import { ata, MINT, milestonePda, projectPda, START_TIME, WINDOW } from "./pdas";

export interface ProjectRef {
  address: PublicKey;
  id: Buffer;
  vault: PublicKey;
  buyer: Keypair;
  seller: Keypair;
  arbitrator: Keypair | null;
}
export interface DraftOptions {
  buyer?: Keypair; seller?: Keypair; arbitrator?: Keypair | null;
  count?: number; window?: bigint; id?: Buffer;
}

/** Test instruction factory: no state writes other than submitted instructions. */
export class Client {
  constructor(readonly r: Runtime) {}

  async draftInstruction(options: DraftOptions = {}) {
    const buyer = options.buyer ?? this.r.buyer;
    const seller = options.seller ?? this.r.seller;
    const arbitrator = options.arbitrator === undefined ? this.r.arbitrator : options.arbitrator;
    const id = options.id ?? randomBytes(16);
    const [address] = projectPda(buyer.publicKey, id);
    const ref: ProjectRef = { address, id, buyer, seller, arbitrator, vault: ata(address) };
    const instruction = await this.r.ix("createProject", [Array.from(id), seller.publicKey,
      arbitrator?.publicKey ?? null, options.count ?? 1, bn(options.window ?? WINDOW)], {
      buyer: buyer.publicKey, project: address, mint: MINT, vault: ref.vault,
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
    });
    return { ref, instruction };
  }

  async draft(options: DraftOptions = {}) {
    const { ref, instruction } = await this.draftInstruction(options);
    this.r.send([this.r.ataInstruction(ref.address, ref.buyer.publicKey), instruction], [ref.buyer]);
    return ref;
  }

  milestone(ref: ProjectRef, index = 0) { return milestonePda(ref.address, index)[0]; }

  addIx(ref: ProjectRef, index: number, amount: bigint, deadline = START_TIME + 7200n, description = "Deliver design") {
    return this.r.ix("addMilestone", [index, bn(amount), bn(deadline), description], {
      buyer: ref.buyer.publicKey, project: ref.address, milestone: this.milestone(ref, index),
      systemProgram: SystemProgram.programId,
    });
  }
  async add(ref: ProjectRef, index: number, amount: bigint, deadline = START_TIME + 7200n, description?: string) {
    this.r.send([await this.addIx(ref, index, amount, deadline, description)], [ref.buyer]);
  }

  manageIx(ref: ProjectRef, action: "finalizeProject" | "cancelProject", actor = ref.buyer) {
    return this.r.ix(action, [], { buyer: actor.publicKey, project: ref.address });
  }
  async finalize(ref: ProjectRef) { this.r.send([await this.manageIx(ref, "finalizeProject")], [ref.buyer]); }
  async cancel(ref: ProjectRef) { this.r.send([await this.manageIx(ref, "cancelProject")], [ref.buyer]); }

  depositIx(ref: ProjectRef, overrides: Record<string, PublicKey> = {}) {
    return this.r.ix("deposit", [], { buyer: ref.buyer.publicKey, project: ref.address,
      mint: MINT, vault: ref.vault, buyerAta: ata(ref.buyer.publicKey), tokenProgram: TOKEN_PROGRAM_ID, ...overrides });
  }
  async deposit(ref: ProjectRef) { this.r.send([await this.depositIx(ref)], [ref.buyer]); }

  actIx(ref: ProjectRef, action: "submitDelivery" | "raiseDispute", index = 0,
    actor = action === "submitDelivery" ? ref.seller : ref.buyer, uri = "ipfs://delivery", overrides: Record<string, PublicKey> = {}) {
    return this.r.ix(action, action === "submitDelivery" ? [uri] : [], { actor: actor.publicKey,
      project: ref.address, milestone: this.milestone(ref, index), ...overrides });
  }
  async submit(ref: ProjectRef, index = 0, uri = "ipfs://delivery") {
    this.r.send([await this.actIx(ref, "submitDelivery", index, ref.seller, uri)], [ref.seller]);
  }
  async dispute(ref: ProjectRef, index = 0, actor = ref.buyer) {
    this.r.send([await this.actIx(ref, "raiseDispute", index, actor)], [actor]);
  }

  settleIx(ref: ProjectRef, action: string, actor: Keypair, index = 0, bps = 7000, overrides: Record<string, PublicKey> = {}) {
    return this.r.ix(action, action === "resolveDispute" ? [bps] : [], { actor: actor.publicKey,
      project: ref.address, milestone: this.milestone(ref, index), mint: MINT, vault: ref.vault,
      buyerAta: ata(ref.buyer.publicKey), sellerAta: ata(ref.seller.publicKey), tokenProgram: TOKEN_PROGRAM_ID, ...overrides });
  }
  async settle(ref: ProjectRef, action: string, actor: Keypair, index = 0, bps = 7000) {
    return this.r.send([this.r.ataInstruction(ref.buyer.publicKey, actor.publicKey),
      this.r.ataInstruction(ref.seller.publicKey, actor.publicKey),
      await this.settleIx(ref, action, actor, index, bps)], [actor]);
  }

  async ready(amounts: bigint[] = [100n], options: DraftOptions = {}, deadline = START_TIME + 7200n) {
    const ref = await this.draft({ ...options, count: amounts.length });
    for (const [index, amount] of amounts.entries()) await this.add(ref, index, amount, deadline);
    await this.finalize(ref);
    return ref;
  }
  async funded(amounts: bigint[] = [100n], options: DraftOptions = {}, deadline = START_TIME + 7200n) {
    const ref = await this.ready(amounts, options, deadline); await this.deposit(ref); return ref;
  }
}
