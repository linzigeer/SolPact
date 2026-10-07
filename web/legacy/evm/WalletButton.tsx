"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function LegacyWalletButton() {
  return <ConnectButton chainStatus="icon" showBalance={false} />;
}
