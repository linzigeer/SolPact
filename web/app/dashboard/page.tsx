"use client";

import dynamic from "next/dynamic";
import { ENABLE_LEGACY_DEMO } from "@/lib/network";
import ProjectDashboard from "@/solana/ProjectDashboard";

const LegacyDashboard = dynamic(() => import("@/legacy/evm/Dashboard"), {
  ssr: false,
});

export default function Dashboard() {
  return ENABLE_LEGACY_DEMO ? <LegacyDashboard /> : <ProjectDashboard />;
}
