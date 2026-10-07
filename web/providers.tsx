"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState, type ReactNode } from "react";
import { ENABLE_LEGACY_DEMO } from "@/lib/network";
import { SolanaProviders } from "@/solana/SolanaProviders";

const LegacyProviders = dynamic(() => import("@/legacy/evm/Providers"), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {ENABLE_LEGACY_DEMO ? (
        <LegacyProviders>{children}</LegacyProviders>
      ) : <SolanaProviders>{children}</SolanaProviders>}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
