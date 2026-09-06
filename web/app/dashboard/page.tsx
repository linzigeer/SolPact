"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  escrowContract,
  type ProjectTuple,
} from "@/lib/contracts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtUSDC, shortAddr } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
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
    <AppShell
      breadcrumb={
        <span>
          <Link href="/" className="hover:text-accent-400">
            首页
          </Link>
          <span className="mx-2 text-primary-700">/</span>
          项目
        </span>
      }
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
            我的项目
          </h1>
          <p className="mt-2 text-sm text-primary-400">
            与你相关的托管合约 · Avalanche Fuji
          </p>
        </div>
        <Button
          className="sm:hidden"
          onClick={() => router.push("/project/new")}
        >
          创建项目
        </Button>
      </div>

      {!isConnected && (
        <EmptyState
          title="连接钱包查看项目"
          description="使用 Avalanche Core 或兼容钱包连接 Fuji 测试网，查看你作为 Buyer / Seller 的托管项目。"
          action={<ConnectButton />}
        />
      )}

      {isConnected &&
        escrowContract.address ===
          "0x0000000000000000000000000000000000000000" && (
          <Card className="border-amber-500/40 bg-amber-500/10 p-6 text-amber-200">
            合约地址未配置。请在{" "}
            <code className="text-xs">.env.local</code> 中设置{" "}
            <code className="text-xs">NEXT_PUBLIC_ESCROW_ADDRESS</code> 与{" "}
            <code className="text-xs">NEXT_PUBLIC_USDC_ADDRESS</code>。
          </Card>
        )}

      {isConnected &&
        escrowContract.address !==
          "0x0000000000000000000000000000000000000000" && (
          <div className="grid gap-3">
            {loading && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-primary-800/60"
                  />
                ))}
              </div>
            )}

            {!loading &&
              projects.map((p, i) => (
                <motion.div
                  key={p.id.toString()}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <Card
                    className="cursor-pointer p-4 transition-colors hover:border-accent-500/40 md:p-5"
                    onClick={() => router.push(`/project/${p.id}`)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-primary-500">
                            Project #{p.id.toString()}
                          </span>
                          <Badge
                            className={
                              p.role === "Buyer"
                                ? "border-accent-500/30 bg-accent-500/10 text-accent-400"
                                : "border-green-500/30 bg-green-500/10 text-green-400"
                            }
                          >
                            {p.role === "Buyer" ? "买方" : "卖方"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-primary-300">
                          对手方{" "}
                          <span className="font-mono text-primary-200">
                            {shortAddr(
                              p.role === "Buyer" ? p.seller : p.buyer
                            )}
                          </span>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="app-meta">总额</span>
                            <p className="mt-0.5 font-bold text-white">
                              {fmtUSDC(p.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="app-meta">已释放</span>
                            <p className="mt-0.5 font-bold text-green-400">
                              {fmtUSDC(p.releasedAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <ProjectStatusBadge status={p.status} />
                        <ArrowRight className="hidden h-4 w-4 text-primary-600 sm:block" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}

            {!loading && projects.length === 0 && (
              <EmptyState
                title="还没有项目"
                description="创建第一个里程碑托管项目，锁定 USDC，按阶段结算。"
                action={
                  <Button onClick={() => router.push("/project/new")}>
                    创建第一个项目
                  </Button>
                }
              />
            )}
          </div>
        )}
    </AppShell>
  );
}
