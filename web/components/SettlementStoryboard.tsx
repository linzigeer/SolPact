"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  FileUp,
  LockKeyhole,
  Pause,
  Play,
  ShieldCheck,
  Zap,
} from "lucide-react";

type Step = "lock" | "deliver" | "approve" | "release";

const STEPS: Step[] = ["lock", "deliver", "approve", "release"];
const DWELL_MS: Record<Step, number> = {
  lock: 1800,
  deliver: 1800,
  approve: 1600,
  release: 2200,
};

const STEP_META: Record<
  Step,
  { label: string; title: string; body: string; status: string }
> = {
  lock: {
    label: "锁定",
    title: "买方锁定预算",
    body: "500 USDC 进入托管合约，而不是打给个人钱包。",
    status: "已托管",
  },
  deliver: {
    label: "交付",
    title: "服务方提交交付物",
    body: "里程碑证据上链：figma.com/demo-phase1",
    status: "已提交",
  },
  approve: {
    label: "确认",
    title: "买方确认里程碑",
    body: "规则满足，准备释放本阶段 200 USDC。",
    status: "确认中",
  },
  release: {
    label: "释放",
    title: "资金即时到账",
    body: "Avalanche 最终性约 2 秒 · Seller 余额跳动。",
    status: "已释放",
  },
};

function balancesFor(step: Step) {
  switch (step) {
    case "lock":
      return { escrow: 500, seller: 100 };
    case "deliver":
    case "approve":
      return { escrow: 500, seller: 100 };
    case "release":
      return { escrow: 300, seller: 300 };
  }
}

export function SettlementStoryboard() {
  const [step, setStep] = useState<Step>("lock");
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setStep((s) => STEPS[(STEPS.indexOf(s) + 1) % STEPS.length]);
    }, DWELL_MS[step]);
    return () => clearTimeout(t);
  }, [step, playing]);

  const bal = balancesFor(step);
  const meta = STEP_META[step];
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none">
      <div className="absolute -inset-6 rounded-[3rem] bg-accent-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-primary-900/90 shadow-2xl backdrop-blur-xl md:rounded-[2.5rem]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/5 px-5 py-4 md:px-6 md:py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">
              Project #1 · Demo
            </p>
            <p className="mt-1 text-base font-black text-white md:text-lg">
              品牌投放 · 第一阶段
            </p>
            <p className="mt-1 font-mono text-[11px] text-primary-500">
              Buyer ⇄ Seller
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={meta.status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-widest ${
                  step === "release"
                    ? "border-green-500/40 bg-green-500/10 text-green-400"
                    : step === "approve"
                      ? "border-accent-500/40 bg-accent-500/10 text-accent-400 animate-pulse"
                      : "border-accent-500/30 bg-accent-500/10 text-accent-400"
                }`}
              >
                {meta.status}
              </motion.span>
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-full border border-white/10 p-2 text-primary-400 transition-colors hover:border-accent-500/40 hover:text-accent-400"
              aria-label={playing ? "暂停预演" : "播放预演"}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Balances — the hero numbers */}
        <div className="grid grid-cols-2 gap-3 px-5 py-5 md:gap-4 md:px-6">
          <div className="rounded-2xl border border-white/5 bg-primary-950/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-500">
              合约余额
            </p>
            <motion.p
              key={`e-${bal.escrow}`}
              initial={{ scale: 1.08, color: "#FBBF24" }}
              animate={{ scale: 1, color: "#F5F5F4" }}
              className="mt-2 text-2xl font-black tabular-nums md:text-3xl"
            >
              {bal.escrow}
              <span className="ml-1 text-sm font-bold text-primary-500">USDC</span>
            </motion.p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              step === "release"
                ? "border-green-500/30 bg-green-500/10"
                : "border-white/5 bg-primary-950/60"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-500">
              Seller 余额
            </p>
            <motion.p
              key={`s-${bal.seller}`}
              initial={{ scale: step === "release" ? 1.15 : 1, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
              className={`mt-2 text-2xl font-black tabular-nums md:text-3xl ${
                step === "release" ? "text-green-400" : "text-primary-100"
              }`}
            >
              {bal.seller}
              <span className="ml-1 text-sm font-bold text-primary-500">USDC</span>
            </motion.p>
            {step === "release" && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs font-black text-green-400"
              >
                +200 USDC · ~2s
              </motion.p>
            )}
          </div>
        </div>

        {/* Step rail */}
        <div className="px-5 md:px-6">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex || step === "release";
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setStep(s);
                  }}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-all ${
                      active
                        ? "border-accent-400 bg-accent-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.45)]"
                        : done
                          ? "border-green-500/40 bg-green-500/15 text-green-400"
                          : "border-white/10 bg-primary-950 text-primary-600"
                    }`}
                  >
                    {s === "lock" && <LockKeyhole className="h-3.5 w-3.5" />}
                    {s === "deliver" && <FileUp className="h-3.5 w-3.5" />}
                    {s === "approve" && <CheckCircle className="h-3.5 w-3.5" />}
                    {s === "release" && <Zap className="h-3.5 w-3.5" />}
                  </div>
                  <span
                    className={`text-[10px] font-black tracking-wider ${
                      active ? "text-accent-400" : "text-primary-600"
                    }`}
                  >
                    {STEP_META[s].label}
                  </span>
                </button>
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

        {/* Current step copy + CTA preview */}
        <div className="px-5 py-5 md:px-6 md:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-white/5 bg-primary-950/50 p-4 md:p-5"
            >
              <p className="text-sm font-black text-white md:text-base">{meta.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-primary-400">{meta.body}</p>

              {step === "approve" && (
                <div className="animate-cta-pulse mt-4 rounded-xl bg-accent-600 py-3 text-center text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-accent-900/40">
                  Approve & Release 200 USDC
                </div>
              )}
              {step === "release" && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 py-3 text-xs font-black uppercase tracking-widest text-green-400">
                  <Zap className="h-3.5 w-3.5" /> 已释放 · Avalanche Finality
                </div>
              )}
              {step === "lock" && (
                <div className="mt-4 rounded-xl border border-white/10 py-3 text-center text-xs font-black uppercase tracking-widest text-primary-400">
                  Deposit 500 USDC → Escrow
                </div>
              )}
              {step === "deliver" && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-center text-xs font-black uppercase tracking-widest text-amber-300">
                  Submit Delivery
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex items-center gap-2 text-xs text-primary-500">
            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
            自动循环预演 · 非真实交易 · 现场 Demo 同一流程
          </div>
        </div>
      </div>
    </div>
  );
}
