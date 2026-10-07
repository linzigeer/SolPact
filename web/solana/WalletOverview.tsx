"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SOLANA_NETWORK_LABEL } from "@/lib/network";
import { formatBaseUnits, solanaExplorerAddress } from "./config";
import { useWalletBalances } from "./useWalletBalances";

export function WalletBalances() {
  const { sol, usdc, usdcConfigured, refreshing, refresh } = useWalletBalances();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-2xl border border-white/5 bg-primary-950/60 p-4">
          <p className="app-meta">SOL 余额</p>
          <p className="mt-2 break-all text-lg font-black text-white" data-testid="sol-balance">
            {sol.isError ? "读取失败" : sol.data === undefined ? "读取中…" : `${formatBaseUnits(sol.data, 9)} SOL`}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/5 bg-primary-950/60 p-4">
          <p className="app-meta">USDC 测试余额</p>
          <p className="mt-2 break-all text-lg font-black text-white" data-testid="usdc-balance">
            {!usdcConfigured ? "待配置" : usdc.isError ? "读取失败" : usdc.data === undefined ? "读取中…" : `${formatBaseUnits(usdc.data, 6)} USDC`}
          </p>
        </div>
      </div>
      {!usdcConfigured && <p className="text-xs leading-relaxed text-primary-400">USDC 测试代币尚未配置，余额将在指定 Devnet mint 后显示。</p>}
      {(sol.isError || usdc.isError) && <p role="status" className="text-xs text-amber-300">余额查询暂不可用，钱包仍已连接。请稍后刷新。</p>}
      <button type="button" onClick={refresh} disabled={refreshing} className="flex items-center gap-2 text-xs text-primary-400 hover:text-accent-400 disabled:opacity-50">
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "正在刷新余额…" : "刷新余额"}
      </button>
    </div>
  );
}

export function WalletAccount() {
  const { publicKey, wallet } = useWallet();
  const address = publicKey?.toBase58();
  if (!address) return null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("钱包地址已复制");
    } catch {
      toast.error("复制失败，请手动复制钱包地址");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-accent-400">{wallet?.adapter.name} · {SOLANA_NETWORK_LABEL}</p>
      <div>
        <p className="app-meta">Solana 钱包地址</p>
        <code className="mt-2 block select-all break-all rounded-xl bg-primary-950/70 p-3 text-xs text-primary-200" data-testid="wallet-address">{address}</code>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button type="button" size="sm" variant="outline" onClick={copyAddress}><Copy className="h-3.5 w-3.5" />复制地址</Button>
          <a href={solanaExplorerAddress(address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-400 hover:underline"><ExternalLink className="h-3.5 w-3.5" />Solana Explorer</a>
        </div>
      </div>
      <WalletBalances />
    </div>
  );
}

export function WalletOverview() {
  const { connected, publicKey } = useWallet();
  return (
    <Card className="space-y-4 p-5 md:p-6">
      <h2 className="text-lg font-black text-white">我的 Solana 钱包</h2>
      {connected && publicKey ? (
        <>
          <WalletAccount />
          <p className="text-xs leading-relaxed text-primary-500">余额来自 Solana Devnet。项目入金使用主关联 USDC 账户，请准备测试 SOL 作为手续费。</p>
        </>
      ) : (
        <p className="text-sm text-primary-400">点击右上角连接钱包，优先使用 Phantom，也支持 Solflare 与已安装的兼容 Solana 钱包。</p>
      )}
    </Card>
  );
}
