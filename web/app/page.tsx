"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white">
      <div className="absolute top-6 right-6">
        <ConnectButton />
      </div>

      <p className="text-emerald-400 text-sm tracking-[0.2em] uppercase">
        Avalanche Builder Day · Chengdu
      </p>
      <h1 className="text-5xl md:text-6xl font-bold text-center leading-tight">
        B2B Stablecoin Escrow
      </h1>
      <p className="text-xl text-slate-300 max-w-2xl text-center">
        Trustless milestone-based payments on Avalanche. Buyer locks USDC,
        seller delivers, code releases funds in ~2 seconds.
      </p>

      <div className="flex gap-4 items-center flex-wrap justify-center">
        {!isConnected && <ConnectButton />}
        {isConnected && (
          <Button size="lg" onClick={() => router.push("/dashboard")}>
            Enter dApp →
          </Button>
        )}
        <Button variant="outline" size="lg" asChild>
          <Link href="/project/new">Create Project</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl w-full">
        {[
          ["0% Platform Fee", "No middleman cut on escrowed funds"],
          ["~2s Settlement", "Avalanche C-Chain finality"],
          ["<$0.01 Gas", "Compared to $2–20 on Ethereum L1"],
        ].map(([t, d]) => (
          <div
            key={t}
            className="p-6 border border-slate-700/80 rounded-xl bg-slate-900/40 backdrop-blur"
          >
            <div className="text-2xl font-bold text-emerald-400">{t}</div>
            <div className="text-slate-400 mt-2">{d}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
