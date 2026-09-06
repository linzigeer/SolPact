"use client";

import { useParams } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
} from "wagmi";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  escrowContract,
  usdcContract,
  type ProjectTuple,
  type MilestoneTuple,
} from "@/lib/contracts";
import { fmtUSDC, shortAddr } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { MilestoneCard } from "@/components/MilestoneCard";
import { SettlementProgress } from "@/components/SettlementProgress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";
import Link from "next/link";
import { snowtraceTx, snowtraceAddress } from "@/lib/explorer";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = BigInt(params.id as string);
  const { address } = useAccount();
  const [metaOpen, setMetaOpen] = useState(false);

  const { data: project, refetch: refetchProject } = useReadContract({
    ...escrowContract,
    functionName: "projects",
    args: [projectId],
  });

  const { data: milestones, refetch: refetchMs } = useReadContract({
    ...escrowContract,
    functionName: "getMilestones",
    args: [projectId],
  });

  useWatchContractEvent({
    ...escrowContract,
    onLogs: () => {
      void refetchProject();
      void refetchMs();
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  if (!project) {
    return (
      <AppShell>
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-primary-800/60" />
          <div className="h-40 animate-pulse rounded-2xl bg-primary-800/60" />
          <div className="h-24 animate-pulse rounded-2xl bg-primary-800/60" />
        </div>
      </AppShell>
    );
  }

  const p = project as unknown as ProjectTuple;
  const buyer = p[0];
  const seller = p[1];
  const arbitrator = p[2];
  const totalAmount = p[4];
  const releasedAmount = p[5];
  const status = Number(p[6]);

  const isBuyer = address?.toLowerCase() === buyer.toLowerCase();
  const isSeller = address?.toLowerCase() === seller.toLowerCase();
  const isArbitrator =
    arbitrator !== "0x0000000000000000000000000000000000000000" &&
    address?.toLowerCase() === arbitrator.toLowerCase();

  const role = isBuyer
    ? "buyer"
    : isSeller
      ? "seller"
      : isArbitrator
        ? "arbitrator"
        : "viewer";

  const roleLabel =
    role === "buyer"
      ? "你是买方"
      : role === "seller"
        ? "你是卖方"
        : role === "arbitrator"
          ? "你是仲裁人"
          : "只读";

  const onDeposit = async () => {
    try {
      const approveHash = await writeContractAsync({
        ...usdcContract,
        functionName: "approve",
        args: [escrowContract.address, totalAmount],
      });
      toast.success("USDC 已授权，正在确认存入…", {
        action: {
          label: "Snowtrace",
          onClick: () => window.open(snowtraceTx(approveHash), "_blank"),
        },
      });

      const depositHash = await writeContractAsync({
        ...escrowContract,
        functionName: "deposit",
        args: [projectId],
      });
      toast.success("已存入托管！", {
        action: {
          label: "Snowtrace",
          onClick: () => window.open(snowtraceTx(depositHash), "_blank"),
        },
      });
      void refetchProject();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      toast.error(err.shortMessage || err.message || "存入失败");
    }
  };

  const ms = (milestones as MilestoneTuple[] | undefined) || [];
  const milestoneStatuses = ms.map((m) => Number(m.status));

  return (
    <AppShell
      breadcrumb={
        <span>
          <Link href="/dashboard" className="hover:text-accent-400">
            项目
          </Link>
          <span className="mx-2 text-primary-700">/</span>
          <span className="font-mono">#{projectId.toString()}</span>
        </span>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-primary-500">
              Project #{projectId.toString()}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">
              {isBuyer ? "你 (Buyer)" : shortAddr(buyer)} ⇄{" "}
              {isSeller ? "你 (Seller)" : shortAddr(seller)}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={status} />
              <Badge
                className={
                  role === "buyer"
                    ? "border-accent-500/30 bg-accent-500/10 text-accent-400"
                    : role === "seller"
                      ? "border-green-500/30 bg-green-500/10 text-green-400"
                      : "border-primary-500/30 bg-primary-800/50 text-primary-400"
                }
              >
                {roleLabel}
              </Badge>
            </div>
          </div>
        </div>

        <SettlementProgress
          totalAmount={totalAmount}
          releasedAmount={releasedAmount}
          projectStatus={status}
          milestoneStatuses={milestoneStatuses}
        />

        {status === 0 && isBuyer && (
          <Button
            size="lg"
            className="w-full animate-cta-pulse"
            disabled={isPending}
            onClick={onDeposit}
          >
            {isPending
              ? "请在钱包中确认…"
              : `存入 ${fmtUSDC(totalAmount)} 到 Escrow`}
          </Button>
        )}

        {status === 0 && !isBuyer && (
          <div className="app-panel px-5 py-4 text-sm text-primary-400">
            等待买方存入 USDC 锁定预算。
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-black text-white">里程碑</h2>
          {ms.map((m, i) => (
            <MilestoneCard
              key={i}
              projectId={projectId}
              index={i}
              milestone={m}
              role={role}
              projectFunded={status >= 1}
            />
          ))}
          {ms.length === 0 && (
            <div className="app-panel px-5 py-8 text-center text-primary-500">
              未找到里程碑
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMetaOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary-500 hover:text-primary-300"
          >
            合约与链接
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${metaOpen ? "rotate-180" : ""}`}
            />
          </button>
          {metaOpen && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <a
                href={snowtraceAddress(escrowContract.address)}
                target="_blank"
                rel="noreferrer"
                className="text-primary-500 underline hover:text-accent-400"
              >
                Escrow on Snowtrace
              </a>
              <a
                href={snowtraceAddress(buyer)}
                target="_blank"
                rel="noreferrer"
                className="text-primary-500 underline hover:text-accent-400"
              >
                Buyer
              </a>
              <a
                href={snowtraceAddress(seller)}
                target="_blank"
                rel="noreferrer"
                className="text-primary-500 underline hover:text-accent-400"
              >
                Seller
              </a>
              {arbitrator !==
                "0x0000000000000000000000000000000000000000" && (
                <span className="font-mono text-xs text-primary-500">
                  Arbitrator {shortAddr(arbitrator)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
