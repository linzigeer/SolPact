"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  Database,
  Globe,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
  AlertTriangle,
  FileText,
  Cpu,
  Key,
} from "lucide-react";
import { SettlementStoryboard } from "@/components/SettlementStoryboard";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<"risk" | "rule">("risk");

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-primary-950 text-primary-200 selection:bg-accent-500/30">
      <div className="bg-noise fixed inset-0 z-[100] pointer-events-none" />

      <nav
        className={`fixed left-0 right-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "border-b border-primary-800 bg-primary-950/80 py-3 backdrop-blur-md"
            : "bg-transparent py-4"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 shadow-lg shadow-accent-900/20">
              <LockKeyhole className="h-5 w-5 text-accent-400" />
            </div>
            <span className="bg-gradient-to-r from-white to-primary-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              MilePay
            </span>
          </Link>
          <div className="hidden space-x-8 text-sm font-medium text-primary-400 md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-accent-400">
              工作原理
            </a>
            <a href="#features" className="transition-colors hover:text-accent-400">
              产品能力
            </a>
            <a href="#why" className="transition-colors hover:text-accent-400">
              为何 Avalanche
            </a>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton />
            <Link
              href="/project/new"
              className="hidden rounded-full bg-accent-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-900/40 transition-all hover:bg-accent-500 active:scale-95 sm:inline-flex"
            >
              创建项目
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pb-10 pt-24 md:pb-20 md:pt-32">
        <div className="absolute left-1/2 top-0 -z-10 h-full w-full -translate-x-1/2">
          <div className="absolute left-[-10%] top-[-10%] h-[60%] w-[60%] animate-pulse rounded-full bg-accent-600/15 blur-[140px]" />
          <div className="absolute bottom-[10%] right-[-5%] h-[50%] w-[50%] rounded-full bg-primary-600/15 blur-[140px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid w-full items-center gap-10 sm:gap-12 lg:grid-cols-[1fr_380px] lg:gap-10 xl:grid-cols-[1fr_460px] xl:gap-14">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative z-10"
            >
              <div className="mb-6 flex flex-wrap justify-start gap-2 sm:mb-8 sm:gap-3">
                <div className="animate-shiny inline-flex items-center space-x-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 sm:px-4 sm:py-1.5">
                  <Sparkles className="h-3 w-3 flex-shrink-0 text-accent-400 sm:h-3.5 sm:w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-accent-400 sm:text-[10px] sm:tracking-[0.15em]">
                    Built on Avalanche
                  </span>
                </div>
                <div className="inline-flex items-center space-x-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 sm:px-4 sm:py-1.5">
                  <ShieldCheck className="h-3 w-3 flex-shrink-0 text-green-400 sm:h-3.5 sm:w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-green-400 sm:text-[10px] sm:tracking-[0.15em]">
                    里程碑托管
                  </span>
                </div>
              </div>

              <h1 className="mb-4 w-full sm:mb-6 md:mb-8">
                <motion.span
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="animate-title-glow animate-title-shimmer block bg-gradient-to-r from-accent-400 via-white to-amber-600 bg-clip-text text-[clamp(2.2rem,7vw+0.5rem,7rem)] font-black italic leading-[1.05] tracking-tighter text-transparent"
                >
                  Trust less.
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mt-1 block bg-gradient-to-b from-white to-white/70 bg-clip-text text-3xl font-black leading-[1.1] tracking-tight text-transparent drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl"
                >
                  Ship more.
                </motion.span>
              </h1>

              <p className="mb-5 max-w-xl text-sm font-medium leading-relaxed text-primary-400/90 sm:mb-8 sm:text-base md:mb-10 md:text-lg lg:text-xl">
                面向跨境团队的里程碑 USDC 托管结算。锁定资金，按阶段交付，在 Avalanche
                上快速完成结算——无需平台抽成。
              </p>

              <div className="mb-5 flex flex-wrap gap-3 text-[9px] font-bold uppercase tracking-[0.12em] text-primary-500 sm:mb-8 sm:gap-4 sm:text-[10px] md:mb-10 md:text-xs md:tracking-[0.2em]">
                <div className="group flex cursor-default items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-accent-500 transition-transform group-hover:rotate-12 sm:h-4 sm:w-4" />
                  跨境服务商
                </div>
                <div className="group flex cursor-default items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-accent-500 transition-transform group-hover:-rotate-12 sm:h-4 sm:w-4" />
                  外包团队
                </div>
                <div className="group flex cursor-default items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-accent-500 transition-transform group-hover:scale-110 sm:h-4 sm:w-4" />
                  DAO 服务供应商
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/project/new"
                  className="animate-cta-pulse animate-shiny group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent-600 px-6 py-3 text-xs font-black text-white shadow-xl transition-all hover:scale-[1.05] hover:bg-accent-500 active:scale-95 sm:px-8 sm:py-4 sm:text-base md:px-10 md:py-5 md:text-lg"
                >
                  <span className="relative z-10">创建项目</span>
                  <ArrowRight className="relative z-10 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-2 sm:h-5 sm:w-5" />
                  <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/20 transition-all group-hover:scale-105 group-hover:border-white/40" />
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-300 transition-colors hover:border-accent-500/40 hover:text-accent-400 sm:px-8 sm:py-4 sm:text-sm"
                >
                  查看项目
                </Link>
              </div>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-primary-600">
                Avalanche Fuji · Mock USDC · 不涉及真实资金
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-0 w-full"
            >
              <SettlementStoryboard />
            </motion.div>
          </div>
        </div>
      </section>

      <section id="why" className="relative bg-primary-950 py-16 md:py-32">
        <div className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-primary-800 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-8 text-4xl font-black italic leading-[1] tracking-tight md:text-7xl md:tracking-tighter">
                问题不是{" "}
                <span className="text-red-500 underline decoration-red-500/40 decoration-8 underline-offset-[12px]">
                  怎么转账
                </span>
                。
              </h2>
              <p className="mb-10 text-xl font-medium leading-relaxed text-primary-400 md:text-2xl">
                而是谁先承担风险——先付款、先交付，还是把钱交给一套不透明的中介规则。
              </p>
              <div className="space-y-6 md:space-y-8">
                {[
                  {
                    title: "买方先付款",
                    desc: "钱已经出去，交付质量只能靠承诺和事后追款。",
                  },
                  {
                    title: "服务方先交付",
                    desc: "成果已经完成，收款仍取决于对方是否愿意付钱。",
                  },
                  {
                    title: "平台托管",
                    desc: "更多手续费、更慢到账，以及你无法验证的规则。",
                  },
                ].map((item) => (
                  <div key={item.title} className="group flex items-start space-x-4 md:space-x-5">
                    <div className="rounded-full bg-accent-500/10 p-2 transition-colors group-hover:bg-accent-500/20">
                      <CheckCircle className="h-6 w-6 flex-shrink-0 text-accent-500 md:h-7 md:w-7" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black uppercase tracking-wider text-primary-100 md:text-xl">
                        {item.title}
                      </h4>
                      <p className="text-base font-medium text-primary-500 md:text-lg">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl md:rounded-[3rem] md:p-12"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="mb-10 flex rounded-2xl border border-white/5 bg-primary-950/50 p-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("risk")}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-4 py-4 text-xs font-black uppercase tracking-[0.15em] transition-all md:text-sm ${
                    activeTab === "risk"
                      ? "border border-red-500/30 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      : "text-primary-500 hover:text-primary-400"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  盲信付款
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("rule")}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-4 py-4 text-xs font-black uppercase tracking-[0.15em] transition-all md:text-sm ${
                    activeTab === "rule"
                      ? "bg-accent-600 text-white shadow-[0_10px_30px_rgba(245,158,11,0.3)]"
                      : "text-primary-500 hover:text-primary-400"
                  }`}
                >
                  <ShieldCheck className="h-5 w-5 flex-shrink-0" />
                  规则托管
                </button>
              </div>

              <div className="relative h-64 font-mono text-sm">
                <AnimatePresence mode="wait">
                  {activeTab === "risk" ? (
                    <motion.div
                      key="risk"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 text-lg font-bold text-red-500">
                        <AlertTriangle className="h-6 w-6 animate-bounce" />{" "}
                        信任缺口已暴露
                      </div>
                      <div className="space-y-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
                        <div className="flex justify-between border-b border-red-500/10 pb-4">
                          <span className="font-bold uppercase tracking-widest text-primary-500">
                            流程
                          </span>
                          <span className="font-black text-red-500">无保障</span>
                        </div>
                        <div className="space-y-3 text-base">
                          <div className="flex justify-between">
                            <span className="text-primary-400">买方付款</span>
                            <span className="font-bold text-red-400">$5,000 已转出</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-400">交付</span>
                            <span className="font-black text-white">「再说吧」</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="rule"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 text-lg font-bold text-accent-400">
                        <CheckCircle className="h-6 w-6" /> 规则已验证
                      </div>
                      <div className="space-y-4 rounded-3xl border border-accent-500/20 bg-accent-500/5 p-8">
                        <div className="flex justify-between border-b border-accent-500/10 pb-4">
                          <span className="font-bold uppercase tracking-widest text-primary-500">
                            托管
                          </span>
                          <span className="font-black text-accent-400">链上执行</span>
                        </div>
                        <div className="space-y-3 text-base">
                          <div className="flex justify-between">
                            <span className="text-primary-400">已锁定</span>
                            <span className="truncate text-accent-200">500 USDC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-400">释放</span>
                            <span className="font-medium italic text-primary-300">
                              买方确认后
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="comparison" className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-32">
        <div className="mb-16 text-center md:mb-24">
          <h2 className="mb-6 text-5xl font-black uppercase italic tracking-tighter md:text-8xl">
            不公平的{" "}
            <span className="text-accent-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              优势
            </span>
          </h2>
          <p className="text-lg font-bold uppercase tracking-[0.2em] text-primary-500 md:text-xl md:tracking-[0.3em]">
            银行电汇 · 托管平台 · Avalanche 里程碑结算
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-sm md:rounded-[3.5rem]">
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-primary-950 to-transparent md:hidden" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left md:min-w-[800px]">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="px-6 py-8 text-xs font-black uppercase tracking-widest text-primary-500 md:px-10 md:py-10 md:text-sm">
                    维度
                  </th>
                  <th className="px-6 py-8 text-xs font-black uppercase tracking-widest text-primary-400 md:px-10 md:py-10 md:text-sm">
                    银行 / 电汇
                  </th>
                  <th className="px-6 py-8 text-xs font-black uppercase tracking-widest text-red-500/80 md:px-10 md:py-10 md:text-sm">
                    托管平台
                  </th>
                  <th className="relative px-6 py-8 text-xs font-black italic uppercase tracking-widest text-accent-400 md:px-10 md:py-10 md:text-sm">
                    MilePay
                    <div className="absolute inset-0 -z-10 border-x border-accent-500/20 bg-accent-500/5" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-bold md:text-base">
                {[
                  { f: "结算速度", b: "3–5 天", e: "1–7 天", z: "约 2 秒" },
                  { f: "平台费用", b: "单笔 $50–200", e: "抽成 5–20%", z: "0%（Demo）" },
                  { f: "里程碑释放", b: "人工处理", e: "客服工单", z: "链上规则" },
                  { f: "退出路径", b: "律师 / 诉讼", e: "不透明争议", z: "超时 / 退款 / 仲裁" },
                  { f: "结算资产", b: "法币通道", e: "法币 / 混合", z: "Avalanche USDC" },
                ].map((row) => (
                  <tr key={row.f} className="group transition-all hover:bg-white/[0.02]">
                    <td className="px-6 py-8 text-primary-300 transition-colors group-hover:text-white md:px-10 md:py-10">
                      {row.f}
                    </td>
                    <td className="px-6 py-8 text-primary-500 md:px-10 md:py-10">{row.b}</td>
                    <td className="px-6 py-8 text-red-500/40 transition-colors group-hover:text-red-500/60 md:px-10 md:py-10">
                      {row.e}
                    </td>
                    <td className="relative px-6 py-8 font-black text-accent-400 md:px-10 md:py-10">
                      {row.z}
                      <div className="absolute inset-0 -z-10 border-x border-accent-500/10 bg-accent-500/[0.02]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative overflow-hidden bg-primary-900/10 py-24 md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.03),transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center md:mb-24">
            <h2 className="mb-6 text-5xl font-black italic tracking-tighter md:text-8xl">
              如何 <span className="text-accent-500">运作</span>
            </h2>
            <p className="text-xl font-bold uppercase tracking-[0.3em] text-primary-500">
              锁定 → 交付 → 释放
            </p>
          </div>

          <div className="relative grid gap-12 lg:grid-cols-3">
            <div className="absolute left-[25%] right-[25%] top-[15%] z-0 hidden h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent lg:block" />

            {[
              {
                icon: <FileText className="h-10 w-10 text-accent-500" />,
                title: "1. 锁定预算",
                desc: "买方创建里程碑、金额与截止时间，然后将 USDC 存入托管合约。",
                tag: "createProject → deposit",
                demo: (
                  <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-primary-400">
                        服务方
                      </label>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-primary-200">
                        0xe6EE…1a72
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-primary-400">
                          金额
                        </label>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-primary-100">
                          200 USDC
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-primary-400">
                          截止
                        </label>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-primary-100">
                          7 天
                        </div>
                      </div>
                    </div>
                    <div className="w-full cursor-default rounded-xl bg-accent-500 py-4 text-center text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-accent-500/20">
                      锁定 USDC
                    </div>
                  </div>
                ),
              },
              {
                icon: <Cpu className="h-10 w-10 text-primary-300" />,
                title: "2. 提交交付",
                desc: "服务方提交交付物链接。状态、时间戳与证据留在链上。",
                tag: "submitDelivery",
                demo: (
                  <div className="rounded-[2rem] border border-white/10 bg-primary-900/60 p-6">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-400">
                      等待确认
                    </p>
                    <p className="mt-3 text-lg font-black text-white">UI 概念稿</p>
                    <p className="mt-2 break-all text-xs text-accent-300">
                      https://figma.com/demo-phase1
                    </p>
                    <div className="mt-6 flex gap-2">
                      <div className="flex-1 rounded-xl bg-emerald-600/90 py-3 text-center text-xs font-black uppercase tracking-widest text-white">
                        确认释放
                      </div>
                      <div className="flex-1 rounded-xl border border-red-500/40 py-3 text-center text-xs font-black uppercase tracking-widest text-red-400">
                        发起争议
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                icon: <ShieldCheck className="h-10 w-10 text-green-500" />,
                title: "3. 释放款项",
                desc: "买方确认后，USDC 约 2 秒到账。超时、退款与仲裁覆盖边缘情况。",
                tag: "approveMilestone",
                demo: (
                  <div className="space-y-4">
                    <div className="-rotate-1 rounded-[2rem] border border-green-500/20 bg-green-500/5 p-5 transition-transform hover:rotate-0">
                      <p className="text-xs font-black uppercase tracking-widest text-green-400">
                        已释放
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">+200 USDC</p>
                      <p className="mt-1 text-xs text-primary-400">服务方钱包 · Avalanche Fuji</p>
                    </div>
                    <div className="rotate-1 rounded-[2rem] border border-white/10 bg-white/5 p-5 transition-transform hover:rotate-0">
                      <p className="text-xs font-black uppercase tracking-widest text-primary-500">
                        最终性
                      </p>
                      <p className="mt-2 font-mono text-sm text-accent-300">约 2 秒</p>
                    </div>
                  </div>
                ),
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative z-10 rounded-[3rem] border border-white/5 bg-white/[0.02] p-8 transition-all hover:border-accent-500/30 hover:bg-white/[0.04]"
              >
                <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary-900 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110">
                  {step.icon}
                </div>
                <h3 className="mb-4 text-2xl font-black uppercase tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="mb-8 text-lg font-medium leading-relaxed text-primary-400">
                  {step.desc}
                </p>
                {step.demo}
                <div className="mt-6 inline-block rounded-full border border-primary-800 bg-primary-900/50 px-5 py-2 font-mono text-xs text-accent-400">
                  {step.tag}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative overflow-hidden bg-primary-950 py-24 md:py-32">
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center md:mb-24">
            <h2 className="mb-6 text-5xl font-black uppercase italic tracking-tighter md:text-8xl">
              什么是{" "}
              <span className="text-accent-500">MilePay</span>
            </h2>
            <p className="text-xl font-bold uppercase tracking-[0.3em] text-primary-500">
              面向 B2B 合作的可编程结算
            </p>
          </div>

          <div className="grid h-auto gap-8 md:grid-cols-6 md:grid-rows-2 md:h-[600px]">
            <motion.div
              whileHover={{ y: -5 }}
              className="group flex flex-col justify-between rounded-[3rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-12 md:col-span-3 md:row-span-2"
            >
              <div>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/10 transition-colors group-hover:bg-accent-500/20">
                  <LockKeyhole className="h-8 w-8 text-accent-500" />
                </div>
                <h3 className="mb-4 text-3xl font-black uppercase tracking-tight text-white">
                  代码即托管
                </h3>
                <p className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-primary-500">
                  核心机制
                </p>
                <div className="mb-8 h-px bg-gradient-to-r from-primary-800 to-transparent" />
                <p className="text-xl font-medium leading-relaxed text-primary-300">
                  <span className="mb-2 block text-xs font-black uppercase text-accent-400">
                    价值
                  </span>
                  预算锁在双方都能验证的合约里——不是打进个人钱包，也不是交给黑箱平台。
                </p>
              </div>
              <div className="mt-8 rounded-2xl border border-white/5 bg-primary-900/30 p-6 font-mono text-xs text-primary-500">
                Escrow.sol · Fuji
                <br />
                {`0x6df99e9f713aB9ECb57fa4842660CBdE0c000Eeb`}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="group flex flex-col justify-center rounded-[3rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-10 md:col-span-3 md:row-span-1"
            >
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-green-500/10 transition-colors group-hover:bg-green-500/20">
                  <Zap className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-white">
                    Avalanche 最终性
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-primary-400">
                    <span className="mr-2 font-black text-green-400">速度</span>
                    买方确认后，服务方约 2 秒看到 USDC 到账，而不是等几天。
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="group flex flex-col justify-center rounded-[3rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent p-10 md:col-span-3 md:row-span-1"
            >
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 transition-colors group-hover:bg-primary-500/20">
                  <Key className="h-8 w-8 text-primary-300" />
                </div>
                <div>
                  <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-white">
                    逃生舱
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-primary-400">
                    <span className="mr-2 font-black text-primary-300">安全</span>
                    自动释放、逾期退款，以及按 bps 分配的仲裁。
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
        <div className="relative overflow-hidden rounded-[4rem] bg-gradient-to-br from-accent-700 to-primary-900 p-12 shadow-2xl md:p-24">
          <div className="absolute inset-0 bg-primary-950/20" />
          <h2 className="relative z-10 mb-8 text-5xl font-black italic leading-none tracking-tighter text-white md:text-8xl">
            Trust less.
            <br />
            Ship more.
          </h2>
          <div className="relative z-10 flex flex-col items-center gap-6">
            <Link
              href="/project/new"
              className="rounded-full bg-white px-12 py-6 text-2xl font-black text-accent-700 shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              创建第一个项目
            </Link>
            <p className="text-sm font-bold uppercase tracking-widest text-accent-200/60">
              Secured by Avalanche C-Chain · Fuji Demo
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl border-t border-primary-900 px-6 py-16 text-center font-medium text-primary-600">
        <div className="mb-8 flex items-center justify-center space-x-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10">
            <LockKeyhole className="h-5 w-5 text-accent-400 opacity-80" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-primary-400">
            MilePay
          </span>
        </div>
        <p>MilePay · Avalanche Builder Day 成都 · 2026</p>
      </footer>
    </div>
  );
}
