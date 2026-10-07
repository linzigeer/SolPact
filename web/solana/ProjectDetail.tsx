"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WalletButton } from "@/components/WalletButton";
import { SolanaProjectDetailPreview } from "@/components/SolanaProjectPreview";
import { useChainTime, useDeployment, useProject, useTransactionFlow } from "./hooks";
import { DeploymentStatus, LoadingProject, QueryError, TransactionProgress, ProjectBadge, RecentTransactions, FaucetLinks, dateTime, money, shortKey } from "./ProjectUI";
import { PROGRAM_ID, USDC_MINT, solanaExplorerAddress } from "./config";
import { addInstruction, chainTime, depositInstructions, manageInstruction, parseUsdc, validateText, type CreationPlan } from "./protocol";
import { continueCreation, savedPlans, removePlan } from "./creation";
import MilestoneCard from "./MilestoneCard";

export default function ProjectDetail() {
  const params = useParams();
  return params.id === "demo" ? <SolanaProjectDetailPreview /> : <LiveProjectDetail key={String(params.id)} id={String(params.id)} />;
}
function LiveProjectDetail({ id }: { id: string }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const address = useMemo(() => { try { return new PublicKey(id); } catch { return null; } }, [id]);
  const query = useProject(address), health = useDeployment(), clock = useChainTime(), flow = useTransactionFlow();
  const [plan, setPlan] = useState<CreationPlan | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("7");
  const [error, setError] = useState("");
  useEffect(() => { setPlan(publicKey ? savedPlans(publicKey.toBase58()).find((item) => item.address === id) || null : null); }, [publicKey, id, query.dataUpdatedAt]);
  const resume = async () => {
    if (!plan || !publicKey || plan.buyer !== publicKey.toBase58()) return;
    await flow.run((send) => continueCreation(connection, plan, send));
    await query.refetch();
  };
  const data = query.data, project = data?.project;
  const buyer = !!project && !!publicKey?.equals(project.buyer), seller = !!project && !!publicKey?.equals(project.seller), arbitrator = !!project?.arbitrator && !!publicKey?.equals(project.arbitrator);
  const role = buyer ? "买方" : seller ? "服务方" : arbitrator ? "仲裁人" : "只读";
  const enabled = !!health.data && !!publicKey && !flow.busy;
  const manage = async (action: "cancel" | "finalize") => {
    if (!project || !buyer) return;
    const result = await flow.run(async (send) => send([await manageInstruction(connection, project.address, project.buyer, action)], action === "cancel" ? "取消未入金项目" : "确认项目条款", id));
    if (result && plan) { removePlan(plan); setPlan(null); }
  };
  const append = async () => {
    setError("");
    if (!project || !publicKey || !buyer) return;
    try {
      validateText(description, "里程碑描述");
      const value = parseUsdc(amount);
      if (!/^\d+$/.test(days) || BigInt(days) < 1n) throw new Error("截止天数需为正整数。");
      const deadline = await chainTime(connection) + BigInt(days) * 86_400n;
      const temporary: CreationPlan = { version: 1, buyer: publicKey.toBase58(), seller: project.seller.toBase58(), arbitrator: project.arbitrator?.toBase58() || null, idHex: "", address: id, window: project.autoReleaseWindow.toString(), milestones: Array.from({ length: project.milestoneCount + 1 }, () => ({ description, amount: value.toString(), deadline: deadline.toString() })) };
      const result = await flow.run(async (send) => send([await addInstruction(connection, temporary, project.milestoneCount)], `追加里程碑 ${project.milestoneCount + 1}`, id));
      if (result) { setDescription(""); setAmount(""); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "里程碑资料无效。"); }
  };
  return (
    <AppShell breadcrumb={<span><Link href="/dashboard">项目</Link> / {shortKey(id)}</span>}>
      <div className="mx-auto max-w-4xl space-y-6">
        <DeploymentStatus />
        {!address ? <EmptyState title="项目地址无效" description="Solana 项目使用完整的 PDA 公钥地址。" action={<Button asChild><Link href="/dashboard">返回项目列表</Link></Button>} /> : query.isPending ? <LoadingProject /> : query.isError ? <QueryError message={query.error.message} retry={() => void query.refetch()} /> : !project ? <Card className="space-y-4 p-6"><h1 className="text-xl font-black text-white">尚未读取到此项目</h1><p className="text-sm text-primary-400">检查地址及网络，或刷新已经发送的创建交易。</p>{plan && <><p className="text-sm text-accent-400">本地创建资料已保存，可以检查交易并恢复同一草稿。</p><Button disabled={!enabled} onClick={() => void resume()}>恢复创建草稿</Button></>}<Button variant="outline" onClick={() => void query.refetch()}>刷新状态</Button></Card> : <>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-primary-500">项目 {shortKey(id)}</p><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">{data!.milestones[0]?.description || "里程碑托管项目"}</h1><div className="mt-3 flex flex-wrap gap-3"><ProjectBadge status={project.status} /><span className="text-sm text-primary-400">{role} · {project.settledCount}/{project.expectedMilestones} 已结算</span></div></div><Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>刷新项目</Button></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["项目预算", project.totalAmount], ["金库余额", data!.vaultBalance], ["服务方实收", project.sellerPaidAmount], ["买方退款", project.buyerRefundedAmount]].map(([label, value]) => <Card key={String(label)} className="min-w-0 p-4"><p className="app-meta">{String(label)}</p><p className="mt-2 break-all text-lg font-black text-white">{money(value as bigint)}</p></Card>)}</div>
          {project.status === "funded" && data!.vaultBalance > project.totalAmount - project.settledAmount && <p className="text-xs text-primary-400">金库包含额外转入代币；协议仅结算双方约定的预算。</p>}
          {!publicKey && <Card className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-sm text-primary-400">连接参与方钱包后显示可执行操作。</p><WalletButton /></Card>}
          {buyer && project.status === "draft" && <Card className="space-y-4 p-5"><h2 className="font-black text-white">继续完成草稿 · {project.milestoneCount}/{project.expectedMilestones}</h2>{plan ? <Button disabled={!enabled} onClick={() => void resume()}>继续创建同一草稿</Button> : project.milestoneCount < project.expectedMilestones ? <><p className="text-sm text-primary-400">此设备没有原始创建资料，请补充剩余里程碑后确认条款。</p><Textarea aria-label="追加里程碑描述" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="交付内容" /><div className="grid grid-cols-2 gap-3"><Input aria-label="追加里程碑金额" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="USDC 金额" /><Input aria-label="追加里程碑截止天数" value={days} onChange={(event) => setDays(event.target.value)} placeholder="截止天数" /></div><Button disabled={!enabled} onClick={() => void append()}>追加里程碑</Button></> : <Button disabled={!enabled} onClick={() => void manage("finalize")}>确认项目条款</Button>}<Button variant="outline" disabled={!enabled} onClick={() => void manage("cancel")}>取消未入金项目</Button>{error && <p role="alert" className="text-sm text-amber-300">{error}</p>}</Card>}
          {project.status === "created" && <Card className="space-y-4 p-5"><h2 className="font-black text-white">{buyer ? "锁定项目预算" : "等待买方入金"}</h2><p className="text-sm text-primary-400">全额入金 {money(project.totalAmount)} · 最早交付截止 {dateTime(project.minDeadline)}</p>{buyer && <><p className="text-xs text-primary-400">买方主 USDC 账户余额：{money(data!.buyerBalance)}</p>{data!.buyerBalance < project.totalAmount && <p className="text-sm text-amber-300">主关联账户 USDC 余额不足，可先领取测试币再刷新。</p>}{clock.now !== null && clock.now >= project.minDeadline && <p className="text-sm text-amber-300">入金期限已过，可取消本项目后重新约定。</p>}<div className="flex flex-wrap gap-3"><Button disabled={!enabled || clock.now === null || clock.now >= project.minDeadline || data!.buyerBalance < project.totalAmount} onClick={() => void flow.run(async (send) => send(await depositInstructions(connection, project), "存入项目预算", id))}>存入 {money(project.totalAmount)}</Button><Button variant="outline" disabled={!enabled} onClick={() => void manage("cancel")}>取消未入金项目</Button></div><FaucetLinks /></>}</Card>}
          <div className="space-y-4"><h2 className="text-xl font-black text-white">里程碑</h2>{data!.milestones.map((milestone) => <MilestoneCard key={milestone.address.toBase58()} project={project} milestone={milestone} now={clock.now} ready={!!health.data} flow={flow} />)}{!data!.milestones.length && <p className="text-sm text-primary-400">尚未添加里程碑。</p>}</div>
          <Card className="space-y-3 p-5"><h2 className="font-black text-white">参与方与链上信息</h2>{[["买方", project.buyer], ["服务方", project.seller], ["仲裁人", project.arbitrator], ["项目 PDA", project.address], ["金库", project.vault], ["USDC Mint", USDC_MINT], ["Program", PROGRAM_ID]].map(([label, value]) => <div key={String(label)} className="flex flex-wrap justify-between gap-2 text-xs"><span className="text-primary-400">{String(label)}</span>{value ? <a className="break-all font-mono text-accent-400 underline" target="_blank" rel="noreferrer" href={solanaExplorerAddress((value as PublicKey).toBase58())}>{(value as PublicKey).toBase58()}</a> : <span className="text-primary-500">未设置</span>}</div>)}<p className="text-xs text-primary-400">创建于 {dateTime(project.createdAt)} · 验收响应期限 {project.autoReleaseWindow.toString()} 秒</p>{!project.arbitrator && <p className="text-xs text-amber-300">本项目不支持仲裁；提交交付后服务方可在验收窗口结束时主动领取。</p>}</Card>
        </>}
        <TransactionProgress flow={flow} /><RecentTransactions project={id} />
      </div>
    </AppShell>
  );
}
