"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WalletOverview } from "./WalletOverview";
import { DeploymentStatus, FaucetLinks, TransactionProgress, money } from "./ProjectUI";
import { useDeployment, useTransactionFlow } from "./hooks";
import { chainTime, parseRoles, parseUsdc, projectPda, validateText, U64_MAX, type CreationPlan } from "./protocol";
import { savePlan, continueCreation } from "./creation";

type Row = { description: string; amount: string; days: string };
export default function NewProject() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const router = useRouter();
  const health = useDeployment();
  const flow = useTransactionFlow();
  const [seller, setSeller] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [hours, setHours] = useState("72");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<CreationPlan | null>(null);
  const [rows, setRows] = useState<Row[]>([{ description: "UI Design mockup", amount: "2", days: "7" }, { description: "Frontend implementation", amount: "3", days: "14" }]);
  const total = useMemo(() => rows.reduce((sum, row) => { try { return sum + parseUsdc(row.amount, true); } catch { return sum; } }, 0n), [rows]);
  const update = (index: number, field: keyof Row, value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  const create = async () => {
    setError("");
    if (!publicKey) { setError("请先连接买方钱包。"); return; }
    try {
      let current = plan;
      if (!current) {
        const roles = parseRoles(publicKey, seller, arbitrator);
        if (!/^\d+$/.test(hours) || BigInt(hours) < 1n || BigInt(hours) > 2160n) throw new Error("验收响应期限需为 1 至 2160 个整数小时。");
        if (!rows.length || rows.length > 20) throw new Error("项目必须包含 1 至 20 个里程碑。");
        const now = await chainTime(connection);
        const milestones = rows.map((row) => {
          validateText(row.description, "里程碑描述");
          if (!/^\d+$/.test(row.days) || BigInt(row.days) < 1n) throw new Error("截止天数需为正整数。");
          const deadline = now + BigInt(row.days) * 86_400n;
          if (deadline > 9_223_372_036_854_775_807n) throw new Error("截止时间超过合约支持范围。");
          return { description: row.description, amount: parseUsdc(row.amount).toString(), deadline: deadline.toString() };
        });
        if (milestones.reduce((sum, row) => sum + BigInt(row.amount), 0n) > U64_MAX) throw new Error("项目总金额超过合约上限。");
        const id = crypto.getRandomValues(new Uint8Array(16));
        current = { version: 1, buyer: publicKey.toBase58(), seller: roles.seller.toBase58(), arbitrator: roles.arbitrator?.toBase58() || null, idHex: Buffer.from(id).toString("hex"), address: projectPda(publicKey, id).toBase58(), window: (BigInt(hours) * 3600n).toString(), milestones };
        savePlan(current); setPlan(current);
      }
      if (current.buyer !== publicKey.toBase58()) throw new Error("请使用创建草稿的买方钱包继续。");
      const address = await flow.run((send) => continueCreation(connection, current!, send));
      if (address) router.push(`/project/${address.toBase58()}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "创建资料无效。"); }
  };
  return (
    <AppShell breadcrumb={<span><Link href="/dashboard">项目</Link> / 创建</span>}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div><h1 className="text-3xl font-black text-white md:text-4xl">创建项目</h1><p className="mt-2 text-sm text-primary-400">约定里程碑、资金与时间，在 Solana Devnet 上建立托管项目。</p></div>
        <DeploymentStatus /><WalletOverview />
        <fieldset disabled={flow.busy || !!plan} className="space-y-6 disabled:opacity-60">
          <Card className="space-y-4 p-5"><div><p className="app-meta">步骤 1</p><h2 className="mt-1 font-black text-white">合作双方</h2></div><div className="space-y-2"><Label htmlFor="seller">服务方 Solana 钱包地址</Label><Input id="seller" value={seller} onChange={(event) => setSeller(event.target.value)} placeholder="服务方钱包公钥" className="font-mono text-xs" /></div><div className="space-y-2"><Label htmlFor="arbitrator">仲裁人地址（可选）</Label><Input id="arbitrator" value={arbitrator} onChange={(event) => setArbitrator(event.target.value)} placeholder="与买卖双方不同的公钥" className="font-mono text-xs" /><p className="text-xs leading-relaxed text-primary-400">不指定仲裁人时，交付后无法发起争议；验收窗口结束后服务方可主动领取。</p></div><div className="space-y-2"><Label htmlFor="window">验收响应期限（小时）</Label><Input id="window" inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} /><p className="text-xs text-primary-500">从每次提交交付开始计时，1 小时至 90 天。</p></div></Card>
          <Card className="space-y-4 p-5"><div className="flex items-center justify-between"><div><p className="app-meta">步骤 2</p><h2 className="mt-1 font-black text-white">里程碑</h2></div><Button type="button" variant="outline" size="sm" disabled={rows.length >= 20} onClick={() => setRows([...rows, { description: "", amount: "", days: "7" }])}><Plus className="h-4 w-4" />添加</Button></div>{rows.map((row, index) => <div key={index} className="space-y-3 rounded-2xl border border-white/5 bg-primary-950/50 p-4"><div className="flex justify-between"><span className="app-meta">#{index + 1}</span>{rows.length > 1 && <button type="button" aria-label="删除里程碑" onClick={() => setRows(rows.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-primary-500" /></button>}</div><Textarea aria-label={`里程碑 ${index + 1} 描述`} value={row.description} onChange={(event) => update(index, "description", event.target.value)} placeholder="约定的交付内容" /><p className="text-right text-[10px] text-primary-500">{new TextEncoder().encode(row.description).length}/256 字节</p><div className="grid grid-cols-2 gap-3"><div><Label htmlFor={`amount-${index}`}>金额 (USDC)</Label><Input id={`amount-${index}`} inputMode="decimal" value={row.amount} onChange={(event) => update(index, "amount", event.target.value)} /></div><div><Label htmlFor={`days-${index}`}>截止天数</Label><Input id={`days-${index}`} inputMode="numeric" value={row.days} onChange={(event) => update(index, "days", event.target.value)} /></div></div></div>)}<div className="flex justify-between border-t border-white/5 pt-4"><span className="text-primary-400">合计</span><span className="font-black text-white">{money(total)}</span></div></Card>
        </fieldset>
        <Card className="space-y-4 p-5"><h2 className="font-black text-white">确认创建</h2><p className="text-sm leading-relaxed text-primary-400">项目将分批写入里程碑，并在每笔交易确认后继续。中断时可恢复同一草稿。创建阶段仅支付 SOL 手续费和账户押金，随后入金才会锁定 USDC。</p>{(error || flow.error) && <p role="alert" className="text-sm text-amber-300">{error || flow.error}</p>}<Button size="lg" className="w-full" disabled={!publicKey || !health.data || flow.busy} onClick={() => void create()}>{flow.busy ? "正在创建，请确认钱包签名…" : plan ? "继续创建同一草稿" : "创建链上项目"}</Button>{plan && <Link href={`/project/${plan.address}`} className="block text-center text-xs text-accent-400 underline">查看已保存草稿</Link>}<FaucetLinks /></Card>
        <TransactionProgress flow={flow} />
      </div>
    </AppShell>
  );
}
