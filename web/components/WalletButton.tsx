"use client";

import dynamic from "next/dynamic";
import { ENABLE_LEGACY_DEMO } from "@/lib/network";
import SolanaWalletButton from "@/solana/SolanaWalletButton";

const LegacyWalletButton = dynamic(
  () => import("@/legacy/evm/WalletButton"),
  { ssr: false }
);

export function WalletButton() {
  return ENABLE_LEGACY_DEMO ? <LegacyWalletButton /> : <SolanaWalletButton />;
}
