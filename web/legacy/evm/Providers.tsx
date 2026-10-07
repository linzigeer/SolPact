"use client";

import type { ReactNode } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { config } from "./wagmi";

export default function LegacyProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider theme={darkTheme({ accentColor: "#10b981" })}>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
