"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  escrowContract,
  type ProjectTuple,
} from "@/lib/contracts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtUSDC, shortAddr } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import Link from "next/link";

type ProjectRow = {
  id: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  totalAmount: bigint;
  releasedAmount: bigint;
  status: number;
  role: "Buyer" | "Seller";
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!address || !client) return;
    if (escrowContract.address === "0x0000000000000000000000000000000000000000") {
      return;
    }
    setLoading(true);
    try {
      const logs = (await client.getContractEvents({
        ...escrowContract,
        eventName: "ProjectCreated",
        fromBlock: 0n,
      })) as Array<{
        args: {
          projectId?: bigint;
          buyer?: `0x${string}`;
          seller?: `0x${string}`;
        };
      }>;

      const mine = logs.filter((l) => {
        const { buyer, seller } = l.args;
        return (
          buyer?.toLowerCase() === address.toLowerCase() ||
          seller?.toLowerCase() === address.toLowerCase()
        );
      });

      const details = await Promise.all(
        mine.map(async (l) => {
          const id = l.args.projectId!;
          const p = (await client.readContract({
            ...escrowContract,
            functionName: "projects",
            args: [id],
          })) as unknown as ProjectTuple;

          return {
            id,
            buyer: p[0],
            seller: p[1],
            totalAmount: p[4],
            releasedAmount: p[5],
            status: Number(p[6]),
            role:
              p[0].toLowerCase() === address.toLowerCase()
                ? ("Buyer" as const)
                : ("Seller" as const),
          };
        })
      );

      details.sort((a, b) => Number(b.id - a.id));
      setProjects(details);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address, client]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <Link href="/" className="text-sm text-emerald-400 hover:underline">
              ← Home
            </Link>
            <h1 className="text-3xl font-bold mt-1">My Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton />
            <Button onClick={() => router.push("/project/new")}>
              + New Project
            </Button>
          </div>
        </div>

        {!isConnected && (
          <Card className="p-12 text-center text-slate-400">
            Connect your wallet to see projects.
          </Card>
        )}

        {isConnected &&
          escrowContract.address ===
            "0x0000000000000000000000000000000000000000" && (
            <Card className="p-6 text-amber-300 border-amber-700">
              Contract address not set. Add{" "}
              <code className="text-xs">NEXT_PUBLIC_ESCROW_ADDRESS</code> and{" "}
              <code className="text-xs">NEXT_PUBLIC_USDC_ADDRESS</code> to{" "}
              <code className="text-xs">.env.local</code> after deploying to
              Fuji.
            </Card>
          )}

        {isConnected && (
          <div className="grid gap-4">
            {loading && (
              <div className="text-slate-400 text-center py-8">Loading…</div>
            )}
            {!loading &&
              projects.map((p) => (
                <Card
                  key={p.id.toString()}
                  className="p-4 cursor-pointer hover:border-emerald-500 transition-colors"
                  onClick={() => router.push(`/project/${p.id}`)}
                >
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <div className="font-mono text-sm text-slate-500">
                        Project #{p.id.toString()}
                      </div>
                      <div className="mt-1">
                        You are: <span className="font-bold">{p.role}</span> ·
                        Counterparty:{" "}
                        {shortAddr(
                          p.role === "Buyer" ? p.seller : p.buyer
                        )}
                      </div>
                      <div className="text-slate-400 text-sm mt-1">
                        Total: {fmtUSDC(p.totalAmount)} · Released:{" "}
                        {fmtUSDC(p.releasedAmount)}
                      </div>
                    </div>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                </Card>
              ))}
            {!loading && projects.length === 0 && (
              <div className="text-center text-slate-400 py-12">
                No projects yet. Click &quot;+ New Project&quot; to create one.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
