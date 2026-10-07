"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { AppShell } from "@/components/AppShell";
import { WalletButton } from "@/components/WalletButton";
import { WalletOverview } from "./WalletOverview";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjects } from "./hooks";
import { savedPlans } from "./creation";
import { type CreationPlan } from "./protocol";
import { DeploymentStatus, LoadingProject, QueryError, ProjectBadge, RecentTransactions, money, shortKey } from "./ProjectUI";

export default function ProjectDashboard() {
  const { publicKey } = useWallet();
  const query = useProjects();
  const [plans, setPlans] = useState<CreationPlan[]>([]);
  const [role, setRole] = useState("all");
  const [limit, setLimit] = useState(20);
  useEffect(() => { setPlans(publicKey ? savedPlans(publicKey.toBase58()) : []); }, [publicKey, query.dataUpdatedAt]);
  const rows = (query.data || []).filter((project) => role === "all" || (role === "buyer" && project.buyer.equals(publicKey!)) || (role === "seller" && project.seller.equals(publicKey!)) || (role === "arbitrator" && project.arbitrator?.equals(publicKey!)));
  const localOnly = plans.filter((plan) => !(query.data || []).some((project) => project.address.toBase58() === plan.address));
  return (
    <AppShell breadcrumb={<span><Link href="/">首页</Link> / 项目</span>}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black text-white md:text-4xl">我的项目</h1><p className="mt-2 text-sm text-primary-400">你的买方、服务方与仲裁项目 · Solana Devnet</p></div><Button variant="outline" disabled={query.isFetching || !publicKey} onClick={() => void query.refetch()}>刷新项目</Button></div>
        <DeploymentStatus />
        <WalletOverview />
        {!publicKey ? <EmptyState title="连接钱包查看项目" description="连接 Phantom 或兼容 Solana 钱包，读取与你相关的真实项目账户。" action={<WalletButton />} /> : <>
          <div className="flex flex-wrap gap-2">{[["all", "全部"], ["buyer", "买方"], ["seller", "服务方"], ["arbitrator", "仲裁人"]].map(([value, text]) => <Button key={value} type="button" size="sm" variant={role === value ? "default" : "outline"} onClick={() => { setRole(value); setLimit(20); }}>{text}</Button>)}</div>
          {query.isError && <QueryError message="项目查询失败，请重试；钱包连接不受影响。" retry={() => void query.refetch()} />}
          {query.isPending && <LoadingProject />}
          {localOnly.map((plan) => <Card key={plan.address} className="space-y-3 border-amber-500/30 p-5"><Badge>待恢复草稿</Badge><p className="text-sm text-primary-300">本地创建资料已保存，链上状态尚待确认。</p><Button asChild><Link href={`/project/${plan.address}`}>检查并继续创建</Link></Button></Card>)}
          {rows.slice(0, limit).map((project) => <Link key={project.address.toBase58()} href={`/project/${project.address.toBase58()}`}><Card className="my-3 p-5 transition-colors hover:border-accent-500/40"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-primary-500">{shortKey(project.address.toBase58())}</p><div className="mt-2 flex gap-2"><Badge>{project.buyer.equals(publicKey) ? "买方" : project.seller.equals(publicKey) ? "服务方" : "仲裁人"}</Badge><ProjectBadge status={project.status} /></div></div><p className="font-black text-white">{money(project.totalAmount)}</p></div><div className="mt-4 flex flex-wrap gap-5 text-xs text-primary-400"><span>里程碑 {project.milestoneCount}/{project.expectedMilestones}</span><span>卖方实收 {money(project.sellerPaidAmount)}</span><span>买方退款 {money(project.buyerRefundedAmount)}</span></div></Card></Link>)}
          {!query.isPending && !query.isError && !rows.length && !localOnly.length && <EmptyState title="还没有相关项目" description="创建一个项目并约定里程碑，服务方也能在自己的钱包下看到该项目。" action={<Button asChild><Link href="/project/new">创建项目</Link></Button>} />}
          {rows.length > limit && <Button variant="outline" onClick={() => setLimit(limit + 20)}>显示更多</Button>}
          <RecentTransactions />
        </>}
      </div>
    </AppShell>
  );
}
