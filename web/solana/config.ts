import { clusterApiUrl, PublicKey } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet" as const;
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER);
export const SOLANA_USDC_MINT =
  process.env.NEXT_PUBLIC_SOLANA_USDC_MINT?.trim() || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const SOLANA_PROGRAM_ADDRESS = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID || "8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt";
export const PROGRAM_ID = new PublicKey(SOLANA_PROGRAM_ADDRESS);
export const USDC_MINT = new PublicKey(SOLANA_USDC_MINT);
export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const connectionEndpoint = () => typeof window === "undefined"
  ? SOLANA_RPC_URL : new URL("/api/solana/devnet", window.location.origin).toString();

export const PHANTOM_DOWNLOAD_URL = "https://phantom.com/download";

export const solanaExplorerAddress = (address: string) =>
  `https://explorer.solana.com/address/${encodeURIComponent(address)}?cluster=${SOLANA_CLUSTER}`;
export const solanaExplorerTransaction = (signature: string) =>
  `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${SOLANA_CLUSTER}`;

export function formatBaseUnits(amount: bigint, decimals: number) {
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${fraction ? `.${fraction}` : ""}`;
}
