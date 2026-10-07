"use client";

import { useCallback, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { toast } from "sonner";
import { chainTime, deploymentHealth, fetchDetails, fetchProjects } from "./protocol";
import { PROGRAM_ID, solanaExplorerTransaction } from "./config";
import { humanError, transact, type Receipt, type TxStage } from "./transactions";

export function useDeployment() {
  const { connection } = useConnection();
  return useQuery({ queryKey: ["solpact-deployment", PROGRAM_ID.toBase58()], queryFn: () => deploymentHealth(connection), staleTime: 60_000, retry: 1 });
}
export function useChainTime() {
  const { connection } = useConnection();
  const query = useQuery({ queryKey: ["solpact-clock"], queryFn: async () => ({ now: await chainTime(connection), fetched: Date.now() }), refetchInterval: 5000, retry: 1 });
  return { ...query, now: query.data?.now ?? null };
}
export function useProjects() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  return useQuery({ queryKey: ["solpact-projects", PROGRAM_ID.toBase58(), publicKey?.toBase58()], queryFn: () => fetchProjects(connection, publicKey!), enabled: !!publicKey, refetchInterval: 5000, retry: 1 });
}
export function useProject(address: PublicKey | null) {
  const { connection } = useConnection();
  return useQuery({ queryKey: ["solpact-project", PROGRAM_ID.toBase58(), address?.toBase58()], queryFn: () => fetchDetails(connection, address!), enabled: !!address, refetchInterval: 5000, retry: 1 });
}
export function useTransactionFlow() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const walletRef = useRef(wallet); walletRef.current = wallet;
  const active = useRef(false);
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<TxStage>("idle");
  const [label, setLabel] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const invalidate = useCallback(async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: ["solpact-projects"] }), cache.invalidateQueries({ queryKey: ["solpact-project"] }), cache.invalidateQueries({ queryKey: ["solana-wallet-usdc"] }), cache.invalidateQueries({ queryKey: ["solana-wallet-sol"] }), cache.invalidateQueries({ queryKey: ["solpact-clock"] })]);
  }, [cache]);
  const run = useCallback(async <T,>(work: (send: (instructions: TransactionInstruction[], label: string, project: string) => Promise<Receipt>) => Promise<T>): Promise<T | undefined> => {
    if (active.current) return;
    const actor = walletRef.current.publicKey;
    if (!actor || !walletRef.current.signTransaction) { toast.error("请先连接支持交易签名的 Solana 钱包。"); return; }
    active.current = true; setBusy(true); setError(""); setReceipt(null);
    const last: { current: Receipt | null } = { current: null };
    try {
      await deploymentHealth(connection);
      const send = async (instructions: TransactionInstruction[], actionLabel: string, project: string) => {
        setLabel(actionLabel);
        const result = await transact({ connection, actor, project, label: actionLabel, instructions,
          sign: (transaction) => walletRef.current.signTransaction!(transaction),
          isCurrentActor: () => !!walletRef.current.publicKey?.equals(actor),
          onStage: (next, record) => { setStage(next); if (record) setReceipt(record); },
        });
        await invalidate();
        last.current = result;
        return result;
      };
      const result = await work(send);
      toast.success("链上操作已确认", { action: last.current ? { label: "查看交易", onClick: () => window.open(solanaExplorerTransaction(last.current!.signature), "_blank") } : undefined });
      return result;
    } catch (cause) {
      const text = humanError(cause); setError(text); setStage("failed"); toast.error(text); await invalidate();
      return undefined;
    } finally { active.current = false; setBusy(false); }
  }, [connection, invalidate]);
  return { run, busy, stage, label, receipt, error, invalidate };
}
