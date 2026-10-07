"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { ChevronDown } from "lucide-react";
import { escrowContract, MilestoneStatus } from "@/legacy/evm/contracts";
import { fmtUSDC, fmtTime } from "@/lib/format";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { snowtraceTx } from "@/legacy/evm/explorer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  Pending: "border-primary-500/40 bg-primary-800/50 text-primary-300",
  Submitted: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  Approved: "border-green-500/40 bg-green-500/10 text-green-400",
  Disputed: "border-red-500/40 bg-red-500/10 text-red-400",
  Refunded: "border-primary-600/40 bg-primary-900 text-primary-500",
};

const STATUS_CN: Record<string, string> = {
  Pending: "待交付",
  Submitted: "已提交",
  Approved: "已释放",
  Disputed: "争议中",
  Refunded: "已退款",
};

type Role = "buyer" | "seller" | "arbitrator" | "viewer";

export function MilestoneCard({
  projectId,
  index,
  milestone,
  role,
  projectFunded,
}: {
  projectId: bigint;
  index: number;
  milestone: {
    description: string;
    amount: bigint;
    deadline: bigint;
    status: number;
    deliverableURI: string;
    submittedAt: bigint;
  };
  role: Role;
  projectFunded: boolean;
}) {
  const [uri, setUri] = useState("");
  const [sellerShare, setSellerShare] = useState("5000");
  const [moreOpen, setMoreOpen] = useState(false);
  const { writeContractAsync, isPending } = useWriteContract();
  const statusName = MilestoneStatus[milestone.status] || "Pending";

  const call = async (fn: string, args: unknown[]) => {
    try {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: fn,
        args,
      });
      toast.success(`${fn} 已发送`, {
        action: {
          label: "Snowtrace",
          onClick: () => window.open(snowtraceTx(hash), "_blank"),
        },
      });
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      toast.error(err.shortMessage || err.message || "交易失败");
    }
  };

  const showPrimarySubmit =
    role === "seller" && statusName === "Pending" && projectFunded;
  const showPrimaryApprove =
    role === "buyer" && statusName === "Submitted";
  const showArbitrate =
    role === "arbitrator" && statusName === "Disputed";

  const hasSecondary =
    (role === "buyer" && statusName === "Submitted") ||
    (role === "seller" && statusName === "Submitted") ||
    (role === "buyer" && statusName === "Pending" && projectFunded);

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="app-meta">里程碑 #{index + 1}</p>
          <p className="mt-1 text-base font-black text-white md:text-lg">
            {milestone.description}
          </p>
          <p className="mt-2 text-sm text-primary-400">
            {fmtUSDC(milestone.amount)} · 截止 {fmtTime(milestone.deadline)} ·{" "}
            <DeadlineCountdown deadline={milestone.deadline} />
          </p>
          {milestone.deliverableURI && (
            <p className="mt-2 break-all text-xs text-accent-400">
              交付物：{" "}
              <a
                href={milestone.deliverableURI}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-accent-300"
              >
                {milestone.deliverableURI}
              </a>
            </p>
          )}
        </div>
        <Badge className={STATUS_STYLE[statusName]}>
          {STATUS_CN[statusName] || statusName}
        </Badge>
      </div>

      {showPrimarySubmit && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="交付物 URL / IPFS CID"
            className="flex-1"
          />
          <Button
            disabled={isPending || !uri}
            className="animate-cta-pulse shrink-0"
            onClick={() =>
              call("submitDelivery", [projectId, BigInt(index), uri])
            }
          >
            提交交付
          </Button>
        </div>
      )}

      {showPrimaryApprove && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            className="animate-cta-pulse"
            disabled={isPending}
            onClick={() =>
              call("approveMilestone", [projectId, BigInt(index)])
            }
          >
            Approve & Release {fmtUSDC(milestone.amount)}
          </Button>
        </div>
      )}

      {showArbitrate && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-primary-400">
            Seller 份额 (bps, 0–10000)：
          </span>
          <Input
            value={sellerShare}
            onChange={(e) => setSellerShare(e.target.value)}
            className="w-24"
          />
          <Button
            disabled={isPending}
            onClick={() =>
              call("resolveDispute", [
                projectId,
                BigInt(index),
                BigInt(sellerShare || "0"),
              ])
            }
          >
            裁决
          </Button>
        </div>
      )}

      {hasSecondary && (
        <div>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary-500 transition-colors hover:text-primary-300"
          >
            更多操作
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                moreOpen && "rotate-180"
              )}
            />
          </button>
          {moreOpen && (
            <div className="mt-3 flex flex-wrap gap-2">
              {role === "buyer" && statusName === "Submitted" && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    call("raiseDispute", [projectId, BigInt(index)])
                  }
                >
                  发起争议
                </Button>
              )}
              {role === "seller" && statusName === "Submitted" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    call("claimAutoRelease", [projectId, BigInt(index)])
                  }
                >
                  超时自动领取
                </Button>
              )}
              {role === "buyer" &&
                statusName === "Pending" &&
                projectFunded && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      call("refundOnDeadlineMiss", [
                        projectId,
                        BigInt(index),
                      ])
                    }
                  >
                    逾期退款
                  </Button>
                )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
