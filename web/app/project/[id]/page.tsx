"use client";

import dynamic from "next/dynamic";
import { ENABLE_LEGACY_DEMO } from "@/lib/network";
import SolanaProjectDetail from "@/solana/ProjectDetail";

const LegacyProjectDetail = dynamic(() => import("@/legacy/evm/ProjectDetail"), {
  ssr: false,
});

export default function ProjectDetail() {
  return ENABLE_LEGACY_DEMO ? <LegacyProjectDetail /> : <SolanaProjectDetail />;
}
