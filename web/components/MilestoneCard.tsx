"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { escrowContract, MilestoneStatus } from "@/lib/contracts";
import { fmtUSDC, fmtTime } from "@/lib/format";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { snowtraceTx } from "@/lib/explorer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const COLOR: Record<string, string> = {
  Pending: "bg-slate-500",
  Submitted: "bg-amber-500",
  Approved: "bg-emerald-500",
  Disputed: "bg-red-500",
  Refunded: "bg-slate-700",
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
  const { writeContractAsync, isPending } = useWriteContract();
  const statusName = MilestoneStatus[milestone.status] || "Pending";

  const call = async (fn: string, args: unknown[]) => {
    try {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: fn,
        args,
      });
      toast.success(`${fn} sent`, {
        action: {
          label: "Snowtrace",
          onClick: () => window.open(snowtraceTx(hash), "_blank"),
        },
      });
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      toast.error(err.shortMessage || err.message || "Transaction failed");
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium">
            #{index + 1}. {milestone.description}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {fmtUSDC(milestone.amount)} · Deadline: {fmtTime(milestone.deadline)}{" "}
            · <DeadlineCountdown deadline={milestone.deadline} />
          </div>
          {milestone.deliverableURI && (
            <div className="text-xs text-emerald-400 mt-1 break-all">
              Delivery:{" "}
              <a
                href={milestone.deliverableURI}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {milestone.deliverableURI}
              </a>
            </div>
          )}
        </div>
        <Badge className={COLOR[statusName]}>{statusName}</Badge>
      </div>

      {role === "seller" && statusName === "Pending" && projectFunded && (
        <div className="flex gap-2">
          <Input
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="Deliverable URL / IPFS CID"
          />
          <Button
            disabled={isPending || !uri}
            onClick={() =>
              call("submitDelivery", [projectId, BigInt(index), uri])
            }
          >
            Submit
          </Button>
        </div>
      )}

      {role === "buyer" && statusName === "Submitted" && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-emerald-600"
            disabled={isPending}
            onClick={() =>
              call("approveMilestone", [projectId, BigInt(index)])
            }
          >
            ✓ Approve & Release {fmtUSDC(milestone.amount)}
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => call("raiseDispute", [projectId, BigInt(index)])}
          >
            Raise Dispute
          </Button>
        </div>
      )}

      {role === "seller" && statusName === "Submitted" && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => call("claimAutoRelease", [projectId, BigInt(index)])}
        >
          Claim (if buyer unresponsive)
        </Button>
      )}

      {role === "buyer" && statusName === "Pending" && projectFunded && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            call("refundOnDeadlineMiss", [projectId, BigInt(index)])
          }
        >
          Refund (if seller missed deadline)
        </Button>
      )}

      {role === "arbitrator" && statusName === "Disputed" && (
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm text-slate-400">
            Seller share (bps, 0–10000):
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
            Resolve
          </Button>
        </div>
      )}
    </Card>
  );
}
