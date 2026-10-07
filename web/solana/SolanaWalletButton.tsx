"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletAccount } from "./WalletOverview";
import { PHANTOM_DOWNLOAD_URL } from "./config";

export default function SolanaWalletButton() {
  const { wallets, wallet, select, connect, disconnect, connected, connecting, disconnecting, publicKey } = useWallet();
  const [open, setOpen] = useState(false);
  const address = publicKey?.toBase58();
  const busy = connecting || disconnecting;
  const orderedWallets = [...wallets].sort((a, b) => {
    const priority = (name: string) => name === "Phantom" ? 0 : name === "Solflare" ? 1 : 2;
    return priority(a.adapter.name) - priority(b.adapter.name);
  }).filter((item) => item.readyState !== WalletReadyState.Unsupported);

  useEffect(() => {
    if (connected) setOpen(false);
  }, [connected]);

  const chooseWallet = async (name: WalletName) => {
    if (wallet?.adapter.name === name) {
      try { await connect(); } catch { /* Provider displays the connection error. */ }
    } else {
      select(name);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
      setOpen(false);
    } catch { /* Provider displays the connection error. */ }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" disabled={busy} aria-label={address ? "查看 Solana 钱包" : "连接 Solana 钱包"} className="rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-60">
          {connecting ? "连接中…" : disconnecting ? "断开中…" : address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "连接钱包"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[201] max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-primary-900 p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="pr-8 text-xl font-black text-white">{connected ? "我的 Solana 钱包" : "连接 Solana 钱包"}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-primary-400">
            {connected ? "地址和余额来自 Solana Devnet；项目操作会另行请求交易签名。" : "优先使用 Phantom。连接仅共享公钥地址，Devnet 余额查询不需要交易签名。"}
          </Dialog.Description>
          <Dialog.Close aria-label="关闭钱包窗口" className="absolute right-5 top-5 rounded-full p-1 text-primary-400 hover:text-white"><X className="h-5 w-5" /></Dialog.Close>
          {connected && address ? (
            <div className="mt-6 space-y-5">
              <WalletAccount />
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={disconnectWallet}><LogOut className="h-4 w-4" />断开钱包</Button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {orderedWallets.map(({ adapter }) => {
                const readyState = adapter.readyState;
                const available = readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable;
                const label = <><Image src={adapter.icon} alt="" width={32} height={32} unoptimized /><span className="flex-1 text-left font-bold">{adapter.name}{adapter.name === "Phantom" && <span className="ml-2 text-[10px] text-accent-400">推荐</span>}</span><span className="text-xs text-primary-400">{available ? connecting && wallet?.adapter.name === adapter.name ? "连接中…" : "连接" : "安装"}</span></>;
                const className = "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-primary-950/50 p-4 text-white transition-colors hover:border-accent-500/40 disabled:opacity-50";
                return available ? (
                  <button key={adapter.name} type="button" className={className} disabled={busy} aria-label={`连接 ${adapter.name}`} onClick={() => void chooseWallet(adapter.name)}>{label}</button>
                ) : (
                  <a key={adapter.name} className={className} aria-label={`安装 ${adapter.name}`} href={adapter.name === "Phantom" ? PHANTOM_DOWNLOAD_URL : adapter.url} target="_blank" rel="noreferrer">{label}</a>
                );
              })}
              <p className="pt-2 text-xs leading-relaxed text-primary-500">桌面浏览器请安装扩展；手机请在 Phantom 或 Solflare 内置浏览器打开本页面。钱包已安装但未检测到时，请刷新页面。</p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
