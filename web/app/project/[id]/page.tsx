"use client";

import { useParams } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  escrowContract,
  usdcContract,
  type ProjectTuple,
  type MilestoneTuple,
} from "@/lib/contracts";
import { fmtUSDC, shortAddr } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { MilestoneCard } from "@/components/MilestoneCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { snowtraceTx, snowtraceAddress } from "@/lib/explorer";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = BigInt(params.id as string);
  const { address } = useAccount();

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
      <main className="min-h-screen bg-slate-950 text-white p-8">
        Loading project…
      </main>
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

  const onDeposit = async () => {
    try {
      const approveHash = await writeContractAsync({
        ...usdcContract,
        functionName: "approve",
        args: [escrowContract.address, totalAmount],
      });
      toast.success("USDC approved. Confirming deposit…", {
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
      toast.success("Deposited!", {
        action: {
          label: "Snowtrace",
          onClick: () => window.open(snowtraceTx(depositHash), "_blank"),
        },
      });
      void refetchProject();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      toast.error(err.shortMessage || err.message || "Deposit failed");
    }
  };

  const ms = (milestones as MilestoneTuple[] | undefined) || [];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-emerald-400 hover:underline"
            >
              ← Dashboard
            </Link>
            <div className="text-sm text-slate-500 font-mono mt-1">
              Project #{projectId.toString()}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              {isBuyer ? "You (Buyer)" : shortAddr(buyer)} ⇄{" "}
              {isSeller ? "You (Seller)" : shortAddr(seller)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ProjectStatusBadge status={status} />
            <ConnectButton />
          </div>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Total</div>
              <div className="font-bold text-lg">{fmtUSDC(totalAmount)}</div>
            </div>
            <div>
              <div className="text-slate-500">Released</div>
              <div className="font-bold text-lg">{fmtUSDC(releasedAmount)}</div>
            </div>
            <div>
              <div className="text-slate-500">Arbitrator</div>
              <div className="font-mono text-xs mt-1">
                {arbitrator === "0x0000000000000000000000000000000000000000"
                  ? "None"
                  : shortAddr(arbitrator)}
              </div>
            </div>
          </div>
        </Card>

        {status === 0 && isBuyer && (
          <Button
            size="lg"
            className="w-full"
            disabled={isPending}
            onClick={onDeposit}
          >
            {isPending
              ? "Confirm in wallet…"
              : `Deposit ${fmtUSDC(totalAmount)} to Escrow →`}
          </Button>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Milestones</h2>
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
            <div className="text-slate-400">No milestones found.</div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href={snowtraceAddress(escrowContract.address)}
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-emerald-400 underline"
          >
            Escrow on Snowtrace →
          </a>
          <a
            href={snowtraceAddress(buyer)}
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-emerald-400 underline"
          >
            Buyer →
          </a>
          <a
            href={snowtraceAddress(seller)}
            target="_blank"
            rel="noreferrer"
            className="text-slate-500 hover:text-emerald-400 underline"
          >
            Seller →
          </a>
        </div>
      </div>
    </main>
  );
}
