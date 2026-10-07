import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "../../target/idl/solpact.json";

export const PROGRAM_ID = new PublicKey(idl.address);
export const MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const USDC = 1_000_000n;
export const START_TIME = 1_800_000_000n;
export const WINDOW = 3_600n;

export function projectPda(buyer: PublicKey, id: Uint8Array) {
  return PublicKey.findProgramAddressSync([Buffer.from("project"), buyer.toBuffer(), id], PROGRAM_ID);
}
export function milestonePda(project: PublicKey, index: number) {
  return PublicKey.findProgramAddressSync([Buffer.from("milestone"), project.toBuffer(), Buffer.from([index])], PROGRAM_ID);
}
export function ata(owner: PublicKey, mint = MINT) {
  return getAssociatedTokenAddressSync(mint, owner, true);
}
