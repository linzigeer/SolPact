import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { Connection, Keypair, PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "../../target/idl/solpact.json";

export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const PROGRAM_ID = new PublicKey(idl.address);
export const MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const LOCAL_DIR = resolve(".devnet");
export const delay = (ms: number) => new Promise<void>(done => setTimeout(done, ms));
export const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export function loadKeypair(file: string) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(file, "utf8"))));
}
function roleKeypair(role: string) {
  const file = resolve(LOCAL_DIR, "keys", `${role}.json`);
  mkdirSync(resolve(LOCAL_DIR, "keys"), { recursive: true, mode: 0o700 });
  if (!existsSync(file)) writeFileSync(file, JSON.stringify(Array.from(Keypair.generate().secretKey)), { mode: 0o600 });
  return loadKeypair(file);
}
export function environment() {
  mkdirSync(LOCAL_DIR, { recursive: true, mode: 0o700 });
  const configFile = process.env.SOLPACT_SOLANA_CONFIG ?? (existsSync(resolve(LOCAL_DIR, "cli-config.yml"))
    ? resolve(LOCAL_DIR, "cli-config.yml") : resolve(homedir(), ".config/solana/cli/config.yml"));
  const config = existsSync(configFile) ? readFileSync(configFile, "utf8") : "";
  const field = (name: string) => config.match(new RegExp(`^${name}:\\s*(.*)$`, "m"))?.[1].trim().replace(/^['"]|['"]$/g, "");
  const rpc = process.env.SOLPACT_DEVNET_RPC_URL ?? field("json_rpc_url");
  assert.ok(rpc, "Missing Devnet RPC configuration");
  const keyfile = (process.env.SOLPACT_DEPLOYER_KEYPAIR ?? field("keypair_path") ?? "~/.config/solana/id.json").replace(/^~/, homedir());
  return { connection: new Connection(rpc, { commitment: "confirmed", disableRetryOnRateLimit: false }),
    payer: loadKeypair(keyfile), buyer: roleKeypair("buyer"), seller: roleKeypair("seller"),
    arbitrator: roleKeypair("arbitrator"), stranger: roleKeypair("stranger") };
}
export type Environment = ReturnType<typeof environment>;

export async function chainTime(connection: Connection) {
  const clock = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed");
  assert.ok(clock, "Clock sysvar is missing");
  return Number(clock.data.readBigInt64LE(32));
}

/** Verify the chain and executable bytes before any wallet transaction. */
export async function verifyDeployment(env: Environment) {
  assert.equal(await env.connection.getGenesisHash(), DEVNET_GENESIS, "Refusing to run outside Devnet");
  const program = await env.connection.getAccountInfo(PROGRAM_ID, "confirmed");
  assert.ok(program?.executable, "SolPact has not been deployed");
  const loader = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
  assert.ok(program.owner.equals(loader));
  assert.equal(program.data.readUInt32LE(0), 2);
  const programDataAddress = new PublicKey(program.data.subarray(4, 36));
  const programData = await env.connection.getAccountInfo(programDataAddress, "confirmed");
  assert.ok(programData && programData.owner.equals(loader));
  assert.equal(programData.data.readUInt32LE(0), 3);
  const artifact = readFileSync(resolve("target/deploy/solpact.so"));
  assert.ok(programData.data.subarray(45, 45 + artifact.length).equals(artifact), "Deployed bytes differ from tested artifact");
  assert.ok(programData.data.subarray(45 + artifact.length).every(byte => byte === 0), "Unexpected trailing program bytes");
  const mint = await getMint(env.connection, MINT, "confirmed", TOKEN_PROGRAM_ID);
  assert.equal(mint.decimals, 6);
  return { programId: PROGRAM_ID.toBase58(), programData: programDataAddress.toBase58(),
    deploymentSlot: programData.data.readBigUInt64LE(4).toString(),
    upgradeAuthority: programData.data[12] ? new PublicKey(programData.data.subarray(13, 45)).toBase58() : null,
    artifactSha256: hash(artifact), artifactBytes: artifact.length, mint: MINT.toBase58(), genesis: DEVNET_GENESIS };
}
