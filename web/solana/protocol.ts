import { BN, Program, type IdlAccounts } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, type Connection, type AccountInfo } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, TOKEN_PROGRAM_ID, unpackAccount } from "@solana/spl-token";
import { Buffer } from "buffer";
import bs58 from "bs58";
import idl from "./idl/solpact.json";
import type { Solpact } from "./idl/solpact";
import { PROGRAM_ID, USDC_MINT, DEVNET_GENESIS } from "./config";

export type ProjectStatus = "draft" | "created" | "funded" | "completed" | "cancelled";
export type MilestoneStatus = "pending" | "submitted" | "approved" | "disputed" | "refunded" | "resolved";
type ProjectData = IdlAccounts<Solpact>["project"];
type MilestoneData = IdlAccounts<Solpact>["milestone"];
export type Project = Omit<ProjectData, "status" | "totalAmount" | "settledAmount" | "sellerPaidAmount" | "buyerRefundedAmount" | "createdAt" | "minDeadline" | "autoReleaseWindow"> & {
  address: PublicKey; status: ProjectStatus; totalAmount: bigint; settledAmount: bigint; sellerPaidAmount: bigint; buyerRefundedAmount: bigint; createdAt: bigint; minDeadline: bigint; autoReleaseWindow: bigint;
};
export type Milestone = Omit<MilestoneData, "status" | "amount" | "deadline" | "submittedAt" | "sellerPaid" | "buyerRefunded"> & {
  address: PublicKey; status: MilestoneStatus; amount: bigint; deadline: bigint; submittedAt: bigint; sellerPaid: bigint; buyerRefunded: bigint;
};
export type ProjectDetails = { project: Project; milestones: Milestone[]; vaultBalance: bigint; buyerBalance: bigint; sellerBalance: bigint };
export type CreationPlan = { version: 1; buyer: string; seller: string; arbitrator: string | null; idHex: string; address: string; window: string; milestones: { amount: string; deadline: string; description: string }[] };
export const U64_MAX = 18_446_744_073_709_551_615n;
export const PROJECT_LABELS: Record<ProjectStatus, string> = { draft: "草稿", created: "待入金", funded: "已托管", completed: "已结束", cancelled: "已取消" };
export const MILESTONE_LABELS: Record<MilestoneStatus, string> = { pending: "待交付", submitted: "待验收", approved: "已付款", disputed: "争议中", refunded: "已退款", resolved: "仲裁已结算" };
export const bn = (value: bigint | string) => new BN(value.toString());
// Decode through hexadecimal to avoid decimal conversion differences across BN builds.
const integer = (value: BN) => { const hex = value.toString(16); return hex.startsWith("-") ? -BigInt(`0x${hex.slice(1)}`) : BigInt(`0x${hex}`); };
export const client = (connection: Connection) => new Program<Solpact>({ ...idl, address: PROGRAM_ID.toBase58() } as unknown as Solpact, { connection });
export const ata = (owner: PublicKey) => getAssociatedTokenAddressSync(USDC_MINT, owner, true);
export function projectPda(buyer: PublicKey, id: Uint8Array) {
  if (id.length !== 16) throw new Error("项目 ID 必须是 16 字节。");
  return PublicKey.findProgramAddressSync([Buffer.from("project"), buyer.toBuffer(), Buffer.from(id)], PROGRAM_ID)[0];
}
export function milestonePda(project: PublicKey, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= 20) throw new Error("里程碑编号无效。");
  return PublicKey.findProgramAddressSync([Buffer.from("milestone"), project.toBuffer(), Buffer.from([index])], PROGRAM_ID)[0];
}
export function parseUsdc(value: string, allowZero = false): bigint {
  const text = value.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new Error("USDC 金额需为十进制数字，最多 6 位小数。");
  const [whole, fraction = ""] = text.split(".");
  const amount = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (amount > U64_MAX || (!allowZero && amount === 0n)) throw new Error("金额必须大于零，且不能超过合约上限。");
  return amount;
}
export function validateText(text: string, label = "文本") {
  if (!text.trim()) throw new Error(`${label}不能为空。`);
  if (new TextEncoder().encode(text).length > 256) throw new Error(`${label}最多 256 个 UTF-8 字节。`);
}
export function parseRoles(buyer: PublicKey, sellerText: string, arbitratorText: string) {
  let seller: PublicKey, arbitrator: PublicKey | null;
  try { seller = new PublicKey(sellerText.trim()); arbitrator = arbitratorText.trim() ? new PublicKey(arbitratorText.trim()) : null; }
  catch { throw new Error("请输入有效的 Solana 钱包地址。"); }
  if (seller.equals(PublicKey.default) || seller.equals(buyer)) throw new Error("服务方不能是空地址或当前买方。");
  if (arbitrator && (arbitrator.equals(PublicKey.default) || arbitrator.equals(buyer) || arbitrator.equals(seller))) throw new Error("仲裁人必须与买卖双方不同。");
  return { seller, arbitrator };
}
function decodeProject(address: PublicKey, data: ProjectData): Project {
  if (data.version !== 1) throw new Error("项目账户版本不受支持。");
  const status = Object.keys(data.status)[0] as ProjectStatus;
  if (!(status in PROJECT_LABELS)) throw new Error("项目状态无法识别。");
  return { ...data, address, status, totalAmount: integer(data.totalAmount), settledAmount: integer(data.settledAmount), sellerPaidAmount: integer(data.sellerPaidAmount), buyerRefundedAmount: integer(data.buyerRefundedAmount), createdAt: integer(data.createdAt), minDeadline: integer(data.minDeadline), autoReleaseWindow: integer(data.autoReleaseWindow) };
}
export async function fetchProject(connection: Connection, address: PublicKey): Promise<Project | null> {
  const info = await connection.getAccountInfo(address, "confirmed");
  if (!info) return null;
  if (!info.owner.equals(PROGRAM_ID)) throw new Error("该地址不是 SolPact 项目账户。");
  return decodeProject(address, client(connection).coder.accounts.decode<ProjectData>("project", info.data));
}
export async function fetchProjects(connection: Connection, owner: PublicKey): Promise<Project[]> {
  const program = client(connection);
  const filters = [[{ memcmp: { offset: 9, bytes: owner.toBase58() } }], [{ memcmp: { offset: 41, bytes: owner.toBase58() } }], [{ memcmp: { offset: 73, bytes: bs58.encode(Uint8Array.of(1)) } }, { memcmp: { offset: 74, bytes: owner.toBase58() } }]];
  const results = await Promise.all(filters.map((filter) => program.account.project.all(filter)));
  const unique = new Map<string, Project>();
  for (const row of results.flat()) {
    const project = decodeProject(row.publicKey, row.account);
    if (project.buyer.equals(owner) || project.seller.equals(owner) || project.arbitrator?.equals(owner)) unique.set(project.address.toBase58(), project);
  }
  return [...unique.values()].sort((a, b) => a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : a.address.toBase58().localeCompare(b.address.toBase58()));
}
export async function fetchDetails(connection: Connection, address: PublicKey): Promise<ProjectDetails | null> {
  const project = await fetchProject(connection, address);
  if (!project) return null;
  if (!project.mint.equals(USDC_MINT) || !project.vault.equals(ata(address)) || !projectPda(project.buyer, Uint8Array.from(project.projectId)).equals(address)) throw new Error("项目账户或代币配置不匹配。");
  const addresses = Array.from({ length: project.milestoneCount }, (_, i) => milestonePda(address, i));
  const infos = await connection.getMultipleAccountsInfo([...addresses, project.vault, ata(project.buyer), ata(project.seller)], "confirmed");
  const coder = client(connection).coder.accounts;
  const milestones = addresses.map((milestoneAddress, index): Milestone => {
    const info = infos[index];
    if (!info || !info.owner.equals(PROGRAM_ID)) throw new Error("里程碑账户暂不可用，请刷新。");
    const data = coder.decode<MilestoneData>("milestone", info.data);
    if (data.version !== 1 || data.index !== index || !data.project.equals(address)) throw new Error("里程碑账户关系无效。");
    const status = Object.keys(data.status)[0] as MilestoneStatus;
    if (!(status in MILESTONE_LABELS)) throw new Error("里程碑状态无法识别。");
    return { ...data, address: milestoneAddress, status, amount: integer(data.amount), deadline: integer(data.deadline), submittedAt: integer(data.submittedAt), sellerPaid: integer(data.sellerPaid), buyerRefunded: integer(data.buyerRefunded) };
  });
  const balance = (key: PublicKey, info: AccountInfo<Buffer> | null) => info ? unpackAccount(key, info, TOKEN_PROGRAM_ID).amount : 0n;
  return { project, milestones, vaultBalance: balance(project.vault, infos[addresses.length]), buyerBalance: balance(ata(project.buyer), infos[addresses.length + 1]), sellerBalance: balance(ata(project.seller), infos[addresses.length + 2]) };
}
export async function chainTime(connection: Connection) {
  const info = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed");
  if (!info || info.data.length < 40) throw new Error("无法读取链上时间。");
  return info.data.readBigInt64LE(32);
}
export async function deploymentHealth(connection: Connection) {
  if (await connection.getGenesisHash() !== DEVNET_GENESIS) throw new Error("RPC 未连接 Solana Devnet，已暂停交易。");
  const [program, mint] = await Promise.all([connection.getAccountInfo(PROGRAM_ID, "confirmed"), connection.getParsedAccountInfo(USDC_MINT, "confirmed")]);
  if (!program?.executable) throw new Error("SolPact 程序暂不可用。");
  if (!mint.value || !mint.value.owner.equals(TOKEN_PROGRAM_ID) || !("parsed" in mint.value.data) || mint.value.data.parsed.type !== "mint" || mint.value.data.parsed.info.decimals !== 6) throw new Error("USDC mint 配置与部署不匹配。");
  return true;
}
export function draftInstructions(connection: Connection, plan: CreationPlan) {
  const buyer = new PublicKey(plan.buyer), project = new PublicKey(plan.address), vault = ata(project);
  return client(connection).methods.createProject(Array.from(Buffer.from(plan.idHex, "hex")), new PublicKey(plan.seller), plan.arbitrator ? new PublicKey(plan.arbitrator) : null, plan.milestones.length, bn(plan.window)).accountsStrict({ buyer, project, mint: USDC_MINT, vault, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId }).instruction().then((ix) => [createAssociatedTokenAccountIdempotentInstruction(buyer, vault, project, USDC_MINT), ix]);
}
export function addInstruction(connection: Connection, plan: CreationPlan, index: number) {
  const row = plan.milestones[index], project = new PublicKey(plan.address);
  return client(connection).methods.addMilestone(index, bn(row.amount), bn(row.deadline), row.description).accountsStrict({ buyer: new PublicKey(plan.buyer), project, milestone: milestonePda(project, index), systemProgram: SystemProgram.programId }).instruction();
}
export function manageInstruction(connection: Connection, project: PublicKey, buyer: PublicKey, action: "finalize" | "cancel") {
  const program = client(connection);
  return (action === "finalize" ? program.methods.finalizeProject() : program.methods.cancelProject()).accountsStrict({ buyer, project }).instruction();
}
export function depositInstructions(connection: Connection, project: Project) {
  const buyerAta = ata(project.buyer);
  return client(connection).methods.deposit().accountsStrict({ buyer: project.buyer, project: project.address, mint: USDC_MINT, buyerAta, vault: project.vault, tokenProgram: TOKEN_PROGRAM_ID }).instruction().then((ix) => [createAssociatedTokenAccountIdempotentInstruction(project.buyer, buyerAta, project.buyer, USDC_MINT), ix]);
}
export type MilestoneAction = "submit" | "dispute" | "approve" | "autoRelease" | "refund" | "resolve";
export async function milestoneInstructions(connection: Connection, project: Project, actor: PublicKey, index: number, action: MilestoneAction, value?: string | number) {
  const program = client(connection), milestone = milestonePda(project.address, index);
  if (action === "submit" || action === "dispute") {
    const builder = action === "submit" ? program.methods.submitDelivery(String(value)) : program.methods.raiseDispute();
    return [await builder.accountsStrict({ actor, project: project.address, milestone }).instruction()];
  }
  const builder = action === "approve" ? program.methods.approveMilestone() : action === "autoRelease" ? program.methods.claimAutoRelease() : action === "refund" ? program.methods.refundOnDeadlineMiss() : program.methods.resolveDispute(Number(value));
  return [createAssociatedTokenAccountIdempotentInstruction(actor, ata(project.buyer), project.buyer, USDC_MINT), createAssociatedTokenAccountIdempotentInstruction(actor, ata(project.seller), project.seller, USDC_MINT), await builder.accountsStrict({ actor, project: project.address, milestone, mint: USDC_MINT, vault: project.vault, buyerAta: ata(project.buyer), sellerAta: ata(project.seller), tokenProgram: TOKEN_PROGRAM_ID }).instruction()];
}
