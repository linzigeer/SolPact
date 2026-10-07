"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, type Adapter, type WalletError } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { toast } from "sonner";
import { connectionEndpoint } from "./config";
import { getPhantomProvider, SolPactPhantomAdapter } from "./phantom";

function PhantomAccountLifecycle() {
  const { connected, wallet, disconnect } = useWallet();
  useEffect(() => {
    if (!connected || !(wallet?.adapter instanceof SolPactPhantomAdapter)) return;
    const provider = getPhantomProvider();
    if (!provider) return;
    const onAccountChanged = (publicKey: unknown) => {
      if (publicKey) {
        try {
          new PublicKey((publicKey as { toBytes(): Uint8Array }).toBytes());
          return;
        } catch { /* Forget a wallet whose new account cannot be identified. */ }
      }
      void disconnect().catch(() => {});
    };
    provider.on("accountChanged", onAccountChanged);
    return () => provider.off("accountChanged", onAccountChanged);
  }, [connected, wallet, disconnect]);
  return null;
}

export function SolanaProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [
    new SolPactPhantomAdapter(),
    new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
  ], []);
  const connectionConfig = useMemo(() => ({
    commitment: "confirmed" as const,
    disableRetryOnRateLimit: true,
  }), []);

  const onError = useCallback((error: WalletError, adapter?: Adapter) => {
    // Transaction errors are handled by the transaction flow with its action label.
    if (/Sign|SendTransaction/.test(error.name)) return;
    if (error.name === "WalletDisconnectedError" ||
        (adapter instanceof SolPactPhantomAdapter && error.name === "WalletPublicKeyError" && !getPhantomProvider()?.publicKey)) return;
    const cause = error.error as { code?: number } | undefined;
    if (cause?.code === 4001 || /reject|declin|cancel|denied/i.test(error.message)) {
      toast.info("已取消钱包连接");
    } else {
      toast.error("钱包连接失败", {
        description: "请解锁钱包并重试，或检查浏览器扩展是否允许访问此站点。",
      });
    }
  }, []);

  return (
    <ConnectionProvider endpoint={connectionEndpoint()} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect onError={onError} localStorageKey="solpact-solana-wallet">
        <PhantomAccountLifecycle />
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
