import { PublicKey, TransactionMessage, VersionedTransaction, SendTransactionError, type Connection, type TransactionInstruction } from "@solana/web3.js";
import bs58 from "bs58";
import idl from "./idl/solpact.json";
import { PROGRAM_ID } from "./config";

export type Receipt = { signature: string; blockhash: string; lastValidBlockHeight: number; label: string; project: string; actor: string; status: "pending" | "confirmed" | "failed" | "expired"; time: number };
export type TxStage = "idle" | "simulating" | "signing" | "sending" | "confirming" | "confirmed" | "failed";
export const STAGE_LABELS: Record<TxStage, string> = { idle: "准备交易", simulating: "检查交易", signing: "请在钱包中签名", sending: "发送交易", confirming: "等待链上确认", confirmed: "交易已确认", failed: "交易未完成" };
const storageKey = (actor: string) => `solpact:devnet:${PROGRAM_ID.toBase58()}:transactions:${actor}`;
export function readReceipts(actor: string): Receipt[] {
  try { return JSON.parse(localStorage.getItem(storageKey(actor)) || "[]"); } catch { return []; }
}
export function storeReceipt(receipt: Receipt) {
  if (typeof window === "undefined") return;
  try {
    const receipts = readReceipts(receipt.actor).filter((r) => r.signature !== receipt.signature);
    localStorage.setItem(storageKey(receipt.actor), JSON.stringify([receipt, ...receipts].slice(0, 40)));
  } catch { /* Confirmation remains authoritative if browser storage is unavailable. */ }
}
export function assemble(instructions: TransactionInstruction[], actor: PublicKey, blockhash: string) {
  return new VersionedTransaction(new TransactionMessage({ payerKey: actor, recentBlockhash: blockhash, instructions }).compileToV0Message());
}
export function packetFits(instructions: TransactionInstruction[], actor: PublicKey) {
  try { return assemble(instructions, actor, PublicKey.default.toBase58()).serialize().length <= 1232; } catch { return false; }
}
const messages: Record<string, string> = {
  Unauthorized: "当前钱包没有执行此操作的权限。", InvalidRole: "买方、服务方和仲裁人地址不符合规则。", InvalidMint: "USDC mint 或小数精度与程序不匹配。", InvalidRecipient: "收款代币账户不属于项目参与方。", InvalidVault: "项目金库校验失败。", InvalidProjectState: "项目状态已变化，请刷新后重试。", InvalidMilestoneState: "里程碑状态已变化，请刷新后重试。", NotFunded: "项目尚未入金或已结束。", InvalidIndex: "里程碑顺序不正确，请从链上进度继续。", InvalidMilestoneCount: "项目必须包含 1 至 20 个里程碑。", IncompleteProject: "尚未添加全部里程碑，不能完成创建。", ZeroAmount: "里程碑金额必须大于零。", InvalidWindow: "验收响应期限必须在 1 小时至 90 天之间。", TooEarly: "尚未达到自动领取时间。", DeadlinePassed: "截止时间已到，不能入金或继续此操作。", NotOverdue: "里程碑尚未逾期，不能退款。", NoArbitrator: "项目未设置仲裁人。", InvalidBps: "服务方分成必须在 0% 至 100% 之间。", TextTooLong: "描述或交付链接超过 256 个 UTF-8 字节。", EmptyUri: "交付链接不能为空。", MathOverflow: "金额或时间超过程序支持范围。", InvalidAccounting: "项目账本校验失败，已暂停结算。", InvalidVersion: "账户版本不受当前客户端支持。",
};
export function humanError(error: unknown, logs: string[] = []): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const text = [...logs, message].join("\n");
  if (/reject|declin|cancel|denied|4001/i.test(text)) return "已取消交易签名；已经确认的草稿进度会保留。";
  const name = text.match(/Error Code: (\w+)/)?.[1];
  if (name && messages[name]) return messages[name];
  const code = text.match(/custom program error: 0x([\da-f]+)/i)?.[1];
  const instructionCode = typeof error === "object" && error && "InstructionError" in error
    ? (error as { InstructionError: [number, { Custom?: number }] }).InstructionError?.[1]?.Custom : undefined;
  const number = code ? parseInt(code, 16) : instructionCode;
  const entry = idl.errors.find((e) => e.code === number);
  if (entry) return messages[entry.name] || entry.msg;
  if (/insufficient funds|insufficient lamports|InsufficientFundsForRent/i.test(text)) return "SOL 或 USDC 余额不足，请检查手续费和入金账户余额。";
  if (/blockhash|expired/i.test(text)) return "交易已过期，请刷新状态后重新签名。";
  return message.replace(/https?:\/\/\S+/g, "[RPC]").slice(0, 260) || "交易未完成，请检查状态后重试。";
}
export class PendingConfirmationError extends Error {
  constructor(readonly signature: string) { super("交易已签名，确认结果暂未确定。请检查这笔交易，再继续操作。"); }
}
export async function reconcileReceipt(connection: Connection, receipt: Receipt) {
  const status = (await connection.getSignatureStatuses([receipt.signature], { searchTransactionHistory: true })).value[0];
  if (status?.err) { receipt.status = "failed"; storeReceipt(receipt); return "failed" as const; }
  if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) { receipt.status = "confirmed"; storeReceipt(receipt); return "confirmed" as const; }
  if (!status && await connection.getBlockHeight("confirmed") > receipt.lastValidBlockHeight) { receipt.status = "expired"; storeReceipt(receipt); return "expired" as const; }
  return "pending" as const;
}
export async function transact(options: {
  connection: Connection; actor: PublicKey; project: string; label: string; instructions: TransactionInstruction[];
  sign: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
  isCurrentActor: () => boolean; onStage: (stage: TxStage, receipt?: Receipt) => void;
}) {
  const { connection, actor, instructions, label, project, onStage } = options;
  for (const previous of readReceipts(actor.toBase58()).filter((r) => r.project === project && r.status === "pending")) {
    if (await reconcileReceipt(connection, previous) === "pending") throw new PendingConfirmationError(previous.signature);
  }
  onStage("simulating");
  const latest = await connection.getLatestBlockhash("confirmed");
  const unsigned = assemble(instructions, actor, latest.blockhash);
  if (unsigned.serialize().length > 1232) throw new Error("交易超过大小限制，请分批提交里程碑。");
  const simulation = (await connection.simulateTransaction(unsigned, { sigVerify: false, commitment: "confirmed" })).value;
  if (simulation.err) throw new Error(humanError(simulation.err, simulation.logs || []));
  if (!options.isCurrentActor()) throw new Error("钱包已切换，请使用原钱包继续操作。");
  onStage("signing");
  const expectedMessage = Array.from(unsigned.message.serialize()).join(",");
  const signed = await options.sign(unsigned);
  if (!options.isCurrentActor()) throw new Error("钱包已切换，交易没有发送。");
  if (Array.from(signed.message.serialize()).join(",") !== expectedMessage || !signed.signatures[0]?.some((byte) => byte !== 0)) throw new Error("钱包返回的交易或签名无效。");
  if (await connection.getBlockHeight("confirmed") > latest.lastValidBlockHeight) throw new Error("签名等待期间交易已过期，请重新签名。");
  const signature = bs58.encode(signed.signatures[0]);
  const receipt: Receipt = { signature, ...latest, label, project, actor: actor.toBase58(), status: "pending", time: Date.now() };
  storeReceipt(receipt);
  onStage("sending", receipt);
  try { await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 }); }
  catch (cause) {
    if (cause instanceof SendTransactionError && (cause.logs?.length || /simulation failed/i.test(cause.message))) {
      receipt.status = "failed"; storeReceipt(receipt);
      throw new Error(humanError(cause, cause.logs || []));
    }
    // A lost broadcast response is reconciled against the signed signature.
  }
  onStage("confirming", receipt);
  for (let attempt = 0; attempt < 45; attempt++) {
    const result = await reconcileReceipt(connection, receipt);
    if (result === "confirmed") { onStage("confirmed", receipt); return receipt; }
    if (result === "failed") {
      const transaction = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      throw new Error(humanError(transaction?.meta?.err, transaction?.meta?.logMessages || []));
    }
    if (result === "expired") throw new Error("交易未确认且已过期，请读取项目状态后重试。");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new PendingConfirmationError(signature);
}
