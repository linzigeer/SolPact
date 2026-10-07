"use client";

import { useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useDeployment } from "./hooks";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PROGRAM_ID, USDC_MINT, formatBaseUnits, solanaExplorerAddress, solanaExplorerTransaction } from "./config";
import { PROJECT_LABELS, type ProjectStatus } from "./protocol";
import { STAGE_LABELS, readReceipts, reconcileReceipt, type Receipt } from "./transactions";

export const shortKey = (address: string) => `${address.slice(0, 5)}…${address.slice(-5)}`;
export const money = (amount: bigint) => `${formatBaseUnits(amount, 6)} USDC`;
export function dateTime(seconds: bigint) {
  const date = new Date(Number(seconds) * 1000);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "待设置";
}
export function ProjectBadge({ status }: { status: ProjectStatus }) {
  return <Badge className={status === "funded" ? "border-accent-500/40 bg-accent-500/10 text-accent-400" : status === "completed" ? "border-green-500/40 text-green-400" : status === "cancelled" ? "border-red-500/40 text-red-400" : ""}>{PROJECT_LABELS[status]}</Badge>;
}
export function DeploymentStatus() {
  const health = useDeployment();
  return (
    <div className="app-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
      <span className={health.isError ? "text-amber-300" : "text-primary-400"}>Solana Devnet · {health.isPending ? "正在检查部署…" : health.isError ? "连接暂不可用" : "合约已部署"}</span>
      <a href={solanaExplorerAddress(PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer" className="font-mono text-accent-400">Program {shortKey(PROGRAM_ID.toBase58())}</a>
      {health.isError && <div className="flex w-full items-center gap-3 text-amber-300"><span>{health.error.message}</span><button type="button" onClick={() => void health.refetch()} className="underline">重试</button></div>}
    </div>
  );
}
export function LoadingProject() {
  return <div className="space-y-3" aria-label="正在读取链上账户"><div className="h-8 w-48 animate-pulse rounded-lg bg-primary-800/60" /><div className="h-40 animate-pulse rounded-2xl bg-primary-800/60" /><div className="h-24 animate-pulse rounded-2xl bg-primary-800/60" /></div>;
}
export function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return <Card className="space-y-3 border-amber-500/30 p-5"><p className="text-sm text-amber-200">{message}</p><Button type="button" variant="outline" onClick={retry}>重新加载</Button></Card>;
}
export function TransactionProgress({ flow }: { flow: ReturnType<typeof import("./hooks").useTransactionFlow> }) {
  if (flow.stage === "idle" && !flow.error) return null;
  return <Card className="space-y-2 p-4" role="status"><p className="font-bold text-white">{flow.label} · {STAGE_LABELS[flow.stage]}</p>{flow.error && <p className="text-sm text-amber-300">{flow.error}</p>}{flow.receipt && <a target="_blank" rel="noreferrer" href={solanaExplorerTransaction(flow.receipt.signature)} className="block break-all font-mono text-xs text-accent-400 underline">{flow.receipt.signature}</a>}</Card>;
}
export function RecentTransactions({ project }: { project?: string }) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [refresh, setRefresh] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  if (!publicKey) return null;
  const records = readReceipts(publicKey.toBase58()).filter((record) => !project || record.project === project).slice(0, 8);
  if (!records.length) return null;
  const check = async (record: Receipt) => {
    setChecking(true); setError("");
    try { await reconcileReceipt(connection, record); setRefresh(refresh + 1); }
    catch { setError("暂时无法确认，请稍后检查或在浏览器中查看。"); }
    finally { setChecking(false); }
  };
  return <Card className="space-y-3 p-5"><h2 className="font-black text-white">最近交易</h2>{records.map((record) => <div key={record.signature} className="flex flex-wrap items-center justify-between gap-2 text-xs"><a href={solanaExplorerTransaction(record.signature)} target="_blank" rel="noreferrer" className="text-accent-400 underline">{record.label} · {shortKey(record.signature)}</a><span className="text-primary-400">{({ confirmed: "已确认", pending: "待确认", failed: "失败", expired: "已过期" })[record.status]}</span>{record.status === "pending" && <button type="button" disabled={checking} onClick={() => void check(record)} className="text-accent-400 underline">检查状态</button>}</div>)}{error && <p className="text-xs text-amber-300">{error}</p>}</Card>;
}
export function FaucetLinks() {
  return <div className="flex flex-wrap gap-4 text-xs"><a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-accent-400 underline">领取 Devnet SOL</a><a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="text-accent-400 underline">领取 Devnet USDC</a><a href={solanaExplorerAddress(USDC_MINT.toBase58())} target="_blank" rel="noreferrer" className="text-primary-400 underline">查看 USDC mint</a><Link href="/project/new" className="text-primary-400 underline">创建项目</Link></div>;
}
