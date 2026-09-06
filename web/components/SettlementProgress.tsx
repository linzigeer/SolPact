"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  FileUp,
  LockKeyhole,
  Zap,
} from "lucide-react";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

type Step = "lock" | "deliver" | "approve" | "release";

const STEPS: Step[] = ["lock", "deliver", "approve", "release"];

const STEP_META: Record<Step, { label: string }> = {
  lock: { label: "锁定" },
  deliver: { label: "交付" },
  approve: { label: "确认" },
  release: { label: "释放" },
};

/** Derive settlement step from on-chain project + milestone statuses. */
export function deriveSettlementStep(
  projectStatus: number,
  milestoneStatuses: number[]
): Step {
  if (projectStatus === 0) return "lock";
  if (projectStatus >= 2) return "release";

  const hasSubmitted = milestoneStatuses.some((s) => s === 1);
  if (hasSubmitted) return "approve";

  const allDone =
    milestoneStatuses.length > 0 &&
    milestoneStatuses.every((s) => s === 2 || s === 4);
  if (allDone) return "release";

  return "deliver";
}

function fmtAmount(n: bigint) {
  return Number(formatUnits(n, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function SettlementProgress({
  totalAmount,
  releasedAmount,
  projectStatus,
  milestoneStatuses,
}: {
  totalAmount: bigint;
  releasedAmount: bigint;
  projectStatus: number;
  milestoneStatuses: number[];
}) {
  const step = deriveSettlementStep(projectStatus, milestoneStatuses);
  const stepIndex = STEPS.indexOf(step);
  const locked = totalAmount - releasedAmount;
  const released = releasedAmount;
  const isRelease = step === "release";

  return (
    <div className="app-panel overflow-hidden">
      <div className="grid grid-cols-2 gap-3 border-b border-white/5 p-4 md:gap-4 md:p-5">
        <div className="rounded-2xl border border-white/5 bg-primary-950/60 p-4">
          <p className="app-meta">合约余额</p>
          <motion.p
            key={`lock-${locked.toString()}`}
            initial={{ scale: 1.06, color: "#FBBF24" }}
            animate={{ scale: 1, color: "#F5F5F4" }}
            className="mt-2 text-2xl font-black tabular-nums md:text-3xl"
          >
            {fmtAmount(locked)}
            <span className="ml-1 text-sm font-bold text-primary-500">USDC</span>
          </motion.p>
        </div>
        <div
          className={cn(
            "rounded-2xl border p-4",
            isRelease
              ? "border-green-500/30 bg-green-500/10"
              : "border-white/5 bg-primary-950/60"
          )}
        >
          <p className="app-meta">已释放</p>
          <motion.p
            key={`rel-${released.toString()}`}
            initial={{ scale: released > 0n ? 1.12 : 1, opacity: 0.75 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className={cn(
              "mt-2 text-2xl font-black tabular-nums md:text-3xl",
              isRelease || released > 0n ? "text-green-400" : "text-primary-100"
            )}
          >
            {fmtAmount(released)}
            <span className="ml-1 text-sm font-bold text-primary-500">USDC</span>
          </motion.p>
          <p className="mt-1 text-xs text-primary-500">
            总额 {fmtAmount(totalAmount)} USDC
          </p>
        </div>
      </div>

      <div className="px-4 py-5 md:px-5">
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((s, i) => {
            const active = i === stepIndex;
            const done = i < stepIndex || step === "release";
            return (
              <div key={s} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-all",
                    active
                      ? "border-accent-400 bg-accent-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.45)]"
                      : done
                        ? "border-green-500/40 bg-green-500/15 text-green-400"
                        : "border-white/10 bg-primary-950 text-primary-600"
                  )}
                >
                  {s === "lock" && <LockKeyhole className="h-3.5 w-3.5" />}
                  {s === "deliver" && <FileUp className="h-3.5 w-3.5" />}
                  {s === "approve" && <CheckCircle className="h-3.5 w-3.5" />}
                  {s === "release" && <Zap className="h-3.5 w-3.5" />}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-black tracking-wider",
                    active ? "text-accent-400" : "text-primary-600"
                  )}
                >
                  {STEP_META[s].label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-primary-800">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-accent-500"
            animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>
    </div>
  );
}
