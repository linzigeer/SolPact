"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, type Connection, type ParsedAccountData } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { SOLANA_RPC_URL, SOLANA_USDC_MINT } from "./config";

const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

async function getUsdcBalance(connection: Connection, owner: PublicKey, mintAddress: string) {
  const mint = new PublicKey(mintAddress);
  const mintAccount = (await connection.getParsedAccountInfo(mint, "confirmed")).value;
  if (!mintAccount || mintAccount.owner.toBase58() !== TOKEN_PROGRAM ||
      !("parsed" in mintAccount.data) || mintAccount.data.parsed.type !== "mint" ||
      mintAccount.data.parsed.info.decimals !== 6) {
    throw new Error("Devnet USDC 测试 mint 必须是 6 位小数的 SPL Token mint。");
  }

  const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint }, "confirmed");
  return accounts.value.reduce((total, account) => {
    const data = account.account.data as ParsedAccountData;
    const tokenAmount = data.parsed.info.tokenAmount;
    if (tokenAmount.decimals !== 6 || !/^\d+$/.test(tokenAmount.amount)) {
      throw new Error("USDC 余额数据格式无效。");
    }
    return total + BigInt(tokenAmount.amount);
  }, 0n);
}

export function useWalletBalances() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const address = publicKey?.toBase58();
  const sol = useQuery({
    queryKey: ["solana-wallet-sol", SOLANA_RPC_URL, address],
    queryFn: async () => {
      const amount = await connection.getBalance(publicKey!, "confirmed");
      if (!Number.isSafeInteger(amount)) throw new Error("SOL 余额超出安全读取范围。");
      return BigInt(amount);
    },
    enabled: connected && !!publicKey,
    staleTime: 15_000,
    refetchInterval: 10_000,
    retry: 1,
  });
  const usdc = useQuery({
    queryKey: ["solana-wallet-usdc", SOLANA_RPC_URL, address, SOLANA_USDC_MINT],
    queryFn: () => getUsdcBalance(connection, publicKey!, SOLANA_USDC_MINT!),
    enabled: connected && !!publicKey && !!SOLANA_USDC_MINT,
    staleTime: 15_000,
    refetchInterval: 5000,
    retry: 1,
  });

  return {
    sol,
    usdc,
    usdcConfigured: !!SOLANA_USDC_MINT,
    refreshing: sol.isFetching || usdc.isFetching,
    refresh: () => {
      void sol.refetch();
      if (SOLANA_USDC_MINT) void usdc.refetch();
    },
  };
}
