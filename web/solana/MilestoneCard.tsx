"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Project, type Milestone, type MilestoneAction, MILESTONE_LABELS, milestoneInstructions, validateText } from "./protocol";
import { type useTransactionFlow } from "./hooks";
import { dateTime, money } from "./ProjectUI";

export function deliveryLink(uri: string): string | null {
  try {
    const url = new URL(uri);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    if (url.protocol === "ipfs:" && url.hostname) return `https://ipfs.io/ipfs/${url.hostname}${url.pathname}`;
  } catch { /* Non-URL evidence remains visible as text. */ }
  return null;
}
export function shareBps(text: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("请输入 0 至 100 的百分比，最多两位小数。");
  const [whole, fraction = ""] = text.split(".");
  const value = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (value > 10_000n) throw new Error("分成不能超过 100%。");
  return Number(value);
}
export default function MilestoneCard({ project, milestone: m, now, ready, flow }: { project: Project; milestone: Milestone; now: bigint | null; ready: boolean; flow: ReturnType<typeof useTransactionFlow> }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [uri, setUri] = useState("");
  const [share, setShare] = useState("50");
  const [error, setError] = useState("");
  const buyer = !!publicKey?.equals(project.buyer), seller = !!publicKey?.equals(project.seller), arbitrator = !!project.arbitrator && !!publicKey?.equals(project.arbitrator);
  const funded = project.status === "funded";
  const active = funded && ready && !!publicKey && !flow.busy;
  const overdue = now !== null && now > m.deadline;
  const unlock = m.submittedAt + project.autoReleaseWindow;
  const canClaim = now !== null && now >= unlock;
  const link = deliveryLink(m.deliverableUri);
  let payout: bigint | null = null;
  try { payout = m.amount * BigInt(shareBps(share)) / 10_000n; } catch { /* Invalid share is reported on submit. */ }
  const call = async (action: MilestoneAction) => {
    if (!publicKey) return;
    setError("");
    try {
      let value: string | number | undefined;
      if (action === "submit") { value = uri.trim(); validateText(value, "交付链接"); if (!deliveryLink(value)) throw new Error("交付链接请使用 HTTP、HTTPS 或 IPFS。"); }
      if (action === "resolve") value = shareBps(share);
      const labels: Record<MilestoneAction, string> = { submit: "提交交付", dispute: "发起争议", approve: "确认并付款", autoRelease: "领取超时款项", refund: "逾期退款", resolve: "提交仲裁结果" };
      await flow.run(async (send) => send(await milestoneInstructions(connection, project, publicKey, m.index, action, value), `${labels[action]} · 里程碑 ${m.index + 1}`, project.address.toBase58()));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "操作无法完成。"); }
  };
  return <Card className="space-y-4 p-5" data-testid={`milestone-${m.index}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="app-meta">里程碑 #{m.index + 1}</p><h3 className="mt-1 font-black text-white">{m.description}</h3><p className="mt-2 text-sm text-primary-400">{money(m.amount)} · 截止 {dateTime(m.deadline)}</p>{m.status === "pending" && <p className={`mt-1 text-xs ${overdue ? "text-amber-300" : "text-primary-500"}`}>{now === null ? "读取链上时间…" : overdue ? "已逾期，买方可申请退款" : "待服务方交付"}</p>}</div><Badge className={m.status === "disputed" ? "border-red-500/40 text-red-400" : ["approved", "resolved"].includes(m.status) ? "border-green-500/40 text-green-400" : ""}>{MILESTONE_LABELS[m.status]}</Badge></div>
    {m.deliverableUri && <p className="break-all text-xs text-accent-400">交付物：{link ? <a href={link} target="_blank" rel="noreferrer" className="underline">{m.deliverableUri}</a> : m.deliverableUri}</p>}
    {m.status === "submitted" && <p className="text-xs text-primary-400">提交于 {dateTime(m.submittedAt)} · 自动领取时间 {dateTime(unlock)}{!project.arbitrator && " · 本项目未设置仲裁人"}</p>}
    {["approved", "refunded", "resolved"].includes(m.status) && <div className="flex flex-wrap gap-4 text-sm"><span className="text-green-400">服务方实收 {money(m.sellerPaid)}</span><span className="text-primary-300">买方退款 {money(m.buyerRefunded)}</span></div>}
    {funded && seller && m.status === "pending" && <div className="space-y-3"><Input aria-label={`里程碑 ${m.index + 1} 交付链接`} value={uri} onChange={(event) => setUri(event.target.value)} placeholder="https://... 或 ipfs://..." /><p className="text-right text-[10px] text-primary-500">{new TextEncoder().encode(uri).length}/256 字节</p><Button disabled={!active || now === null || overdue || !uri.trim()} onClick={() => void call("submit")}>提交交付</Button></div>}
    {funded && buyer && m.status === "submitted" && <Button disabled={!active} onClick={() => void call("approve")}>确认并付款 {money(m.amount)}</Button>}
    {funded && seller && m.status === "submitted" && <Button variant="outline" disabled={!active || !canClaim} onClick={() => void call("autoRelease")}>{canClaim ? "领取超时款项" : "验收窗口尚未结束"}</Button>}
    {funded && buyer && m.status === "pending" && overdue && <Button variant="outline" disabled={!active} onClick={() => void call("refund")}>逾期退款 {money(m.amount)}</Button>}
    {funded && (buyer || seller) && m.status === "submitted" && project.arbitrator && <Button variant="destructive" disabled={!active} onClick={() => void call("dispute")}>发起争议</Button>}
    {funded && arbitrator && m.status === "disputed" && <div className="space-y-3"><label className="block text-sm text-primary-300" htmlFor={`share-${m.index}`}>服务方分成 (%)</label><Input id={`share-${m.index}`} value={share} onChange={(event) => setShare(event.target.value)} inputMode="decimal" /><p className="text-xs text-primary-400">{payout === null ? "请输入有效分成" : `服务方 ${money(payout)} · 买方退款 ${money(m.amount - payout)}`}</p><Button disabled={!active || payout === null} onClick={() => void call("resolve")}>提交仲裁结果</Button></div>}
    {m.status === "disputed" && !arbitrator && <p className="text-xs text-primary-400">等待指定仲裁人分配本阶段资金。</p>}
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
  </Card>;
}
