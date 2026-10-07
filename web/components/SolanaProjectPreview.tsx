"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MigrationNotice } from "@/components/MigrationNotice";
import { EmptyState } from "@/components/EmptyState";
import { SettlementProgress } from "@/components/SettlementProgress";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SOLANA_NETWORK_LABEL } from "@/lib/network";
import { WalletOverview } from "@/solana/WalletOverview";

type Row = { desc: string; amount: string; days: string };

export function SolanaDashboardPreview() {
  return (
    <AppShell breadcrumb={<span><Link href="/">首页</Link> / 项目</span>}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">我的项目</h1>
          <p className="mt-2 text-sm text-primary-400">里程碑托管与结算 · {SOLANA_NETWORK_LABEL}</p>
        </div>
        <MigrationNotice />
        <WalletOverview />
        <Card className="p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">UI 设计与开发</h2>
            <Badge>示例数据</Badge>
          </div>
          <p className="text-sm text-primary-400">2 个里程碑 · 500 USDC · 用于预览项目流程</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild><Link href="/project/demo">查看示例项目</Link></Button>
            <Button variant="outline" asChild><Link href="/project/new">预览创建流程</Link></Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export function SolanaNewProjectPreview() {
  const [seller, setSeller] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [showArbitrator, setShowArbitrator] = useState(false);
  const [rows, setRows] = useState<Row[]>([
    { desc: "UI Design mockup", amount: "200", days: "7" },
    { desc: "Frontend implementation", amount: "300", days: "14" },
  ]);
  const total = useMemo(() => rows.reduce((sum, row) => {
    const amount = Number(row.amount);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0), [rows]);

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  };

  return (
    <AppShell breadcrumb={<span><Link href="/dashboard">项目</Link> / 创建</span>}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">创建项目</h1>
          <p className="mt-2 text-sm text-primary-400">把预算拆成里程碑，为 Solana 托管结算约定规则。</p>
        </div>
        <MigrationNotice />
        <WalletOverview />
        <Card className="space-y-4 p-5 md:p-6">
          <div><p className="app-meta">步骤 1</p><h2 className="mt-1 text-lg font-black text-white">对手方</h2></div>
          <div className="space-y-2">
            <Label htmlFor="solana-seller">服务方 Solana 钱包地址</Label>
            <Input id="solana-seller" value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="输入服务方的 Solana 钱包地址" className="font-mono text-xs sm:text-sm" />
          </div>
          {showArbitrator ? (
            <div className="space-y-2">
              <Label htmlFor="solana-arbitrator">仲裁人 Solana 钱包地址</Label>
              <Input id="solana-arbitrator" value={arbitrator} onChange={(e) => setArbitrator(e.target.value)} placeholder="可选的仲裁人地址" className="font-mono text-xs sm:text-sm" />
            </div>
          ) : (
            <button type="button" onClick={() => setShowArbitrator(true)} className="text-xs font-bold text-primary-500 hover:text-accent-400">+ 添加仲裁人（可选）</button>
          )}
        </Card>
        <Card className="space-y-4 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="app-meta">步骤 2</p><h2 className="mt-1 text-lg font-black text-white">里程碑</h2></div>
            <Button type="button" variant="outline" size="sm" disabled={rows.length >= 20} onClick={() => setRows((current) => [...current, { desc: "", amount: "", days: "7" }])}><Plus className="h-3.5 w-3.5" />添加</Button>
          </div>
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-white/5 bg-primary-950/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="app-meta">#{index + 1}</span>
                  {rows.length > 1 && <button type="button" aria-label="删除里程碑" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} className="text-primary-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>}
                </div>
                <Textarea aria-label={`里程碑 ${index + 1} 描述`} value={row.desc} onChange={(e) => updateRow(index, "desc", e.target.value)} placeholder="描述交付内容" rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`amount-${index}`}>金额 (USDC)</Label>
                    <Input id={`amount-${index}`} type="number" min="0" step="0.000001" className="mt-1" value={row.amount} onChange={(e) => updateRow(index, "amount", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor={`days-${index}`}>截止天数</Label>
                    <Input id={`days-${index}`} type="number" min="1" step="1" className="mt-1" value={row.days} onChange={(e) => updateRow(index, "days", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <span className="text-sm text-primary-400">合计</span>
            <span className="text-xl font-black text-white">{total.toLocaleString()} USDC</span>
          </div>
        </Card>
        <Card className="space-y-4 p-5 md:p-6">
          <div><p className="app-meta">步骤 3</p><h2 className="mt-1 text-lg font-black text-white">确认上链</h2></div>
          <div className="flex flex-wrap gap-3 text-sm text-primary-400">
            {[`${rows.length} 个里程碑`, `${total.toLocaleString()} USDC`, SOLANA_NETWORK_LABEL].map((label) => <span key={label} className="rounded-full border border-white/10 px-3 py-1">{label}</span>)}
          </div>
          <Button disabled size="lg" className="w-full">创建并上链（接入中）</Button>
          <p className="text-xs text-primary-500">当前表单用于界面预览，填写内容不会提交链上交易。</p>
        </Card>
      </div>
    </AppShell>
  );
}

export function SolanaProjectDetailPreview() {
  const params = useParams();
  const id = String(params.id);
  if (id !== "demo" && id !== "0") {
    return (
      <AppShell>
        <div className="space-y-6">
          <MigrationNotice />
          <EmptyState title="项目数据接入中" description="新合约部署后，这里将展示 Solana 上的项目状态。" action={<Button asChild><Link href="/project/demo">查看示例项目</Link></Button>} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb={<span><Link href="/dashboard">项目</Link> / 示例项目</span>}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white md:text-3xl">UI 设计与开发</h1>
          <div className="mt-3 flex flex-wrap gap-2"><Badge>示例项目</Badge><Badge>{SOLANA_NETWORK_LABEL}</Badge><Badge>界面预览</Badge></div>
          <p className="mt-3 text-sm text-primary-400">项目方 ⇄ 服务方 · 以下为示例数据</p>
        </div>
        <MigrationNotice />
        <SettlementProgress totalAmount={500_000_000n} releasedAmount={0n} projectStatus={1} milestoneStatuses={[1, 0]} />
        <div className="space-y-4">
          <h2 className="text-xl font-black text-white">里程碑</h2>
          {[
            { description: "UI Design mockup", amount: 200, days: 7, status: "已提交", uri: "https://figma.com/demo-phase1" },
            { description: "Frontend implementation", amount: 300, days: 14, status: "待交付", uri: "" },
          ].map((milestone, index) => (
            <Card key={milestone.description} className="space-y-4 p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="app-meta">里程碑 #{index + 1}</p><h3 className="mt-1 font-black text-white">{milestone.description}</h3><p className="mt-2 text-sm text-primary-400">{milestone.amount} USDC · 截止 {milestone.days} 天</p></div>
                <Badge>{milestone.status}</Badge>
              </div>
              {milestone.uri && <p className="break-all text-xs text-accent-400">示例交付物：{milestone.uri}</p>}
              <Button disabled>{index === 0 ? "确认并结算（示例）" : "提交交付（示例）"}</Button>
            </Card>
          ))}
        </div>
        <Card className="p-5 text-sm text-primary-400">此处仅展示示例流程；真实项目、金库及交易记录可在项目列表中查看。</Card>
      </div>
    </AppShell>
  );
}
