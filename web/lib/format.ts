import { formatUnits, parseUnits } from "viem";

export const fmtUSDC = (n: bigint) =>
  `${Number(formatUnits(n, 6)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} USDC`;

export const parseUSDC = (n: string | number) => parseUnits(String(n), 6);

export const shortAddr = (a?: string) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";

export const fmtTime = (t: bigint) =>
  new Date(Number(t) * 1000).toLocaleString();
