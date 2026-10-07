"use client";

import dynamic from "next/dynamic";
import { ENABLE_LEGACY_DEMO } from "@/lib/network";
import SolanaNewProject from "@/solana/NewProject";

const LegacyNewProject = dynamic(() => import("@/legacy/evm/NewProject"), {
  ssr: false,
});

export default function NewProject() {
  return ENABLE_LEGACY_DEMO ? <LegacyNewProject /> : <SolanaNewProject />;
}
