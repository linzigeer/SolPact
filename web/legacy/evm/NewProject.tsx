"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Plus, Trash2 } from "lucide-react";
import { escrowContract, USDC_ADDRESS } from "@/legacy/evm/contracts";
import { parseUSDC } from "@/lib/format";
import { snowtraceTx } from "@/legacy/evm/explorer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAddress, zeroAddress } from "viem";

type Row = { desc: string; amount: string; days: string };

export default function NewProject() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [seller, setSeller] = useState(
    "0xe6EE8734b27a36C789db1b529DB01F30064C1a72"
  );
  const [arbitrator, setArbitrator] = useState("");
  const [showArbitrator, setShowArbitrator] = useState(false);
  const [rows, setRows] = useState<Row[]>([
    { desc: "UI Design mockup", amount: "200", days: "7" },
    { desc: "Frontend implementation", amount: "300", days: "14" },
  ]);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  const total = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const n = Number(r.amount);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [rows]
  );

  const addRow = () => setRows([...rows, { desc: "", amount: "", days: "7" }]);
  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  };
  const updRow = (i: number, k: keyof Row, v: string) => {
    const c = [...rows];
    c[i][k] = v;
    setRows(c);
  };

  const onCreate = async () => {
    if (!isAddress(seller)) {
      toast.error("Seller 地址无效");
      return;
    }
    if (arbitrator && !isAddress(arbitrator)) {
      toast.error("Arbitrator 地址无效");
      return;
    }
    if (rows.some((r) => !r.desc || !r.amount || !r.days)) {
      toast.error("请填完所有里程碑字段");
      return;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const descs = rows.map((r) => r.desc);
      const amts = rows.map((r) => parseUSDC(r.amount));
      const dls = rows.map((r) => BigInt(now + Number(r.days) * 86400));

      const tx = await writeContractAsync({
        ...escrowContract,
        functionName: "createProject",
        args: [
          seller as `0x${string}`,
          (arbitrator || zeroAddress) as `0x${string}`,
          USDC_ADDRESS,
          descs,
          amts,
          dls,
          BigInt(3 * 86400),
        ],
      });

      toast.success(`交易已发送：${tx.slice(0, 10)}…`, {
        action: {
          label: "Snowtrace",
          onClick: () => window.open(snowtraceTx(tx), "_blank"),
        },
      });
      setTimeout(() => router.push("/dashboard"), 3500);
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      toast.error(err.shortMessage || err.message || "创建失败");
    }
  };

  return (
    <AppShell
      breadcrumb={
        <span>
          <Link href="/dashboard" className="hover:text-accent-400">
            项目
          </Link>
          <span className="mx-2 text-primary-700">/</span>
          创建
        </span>
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
            创建项目
          </h1>
          <p className="mt-2 text-sm text-primary-400">
            把预算拆成可执行的里程碑规则，上链托管。
          </p>
        </div>

        {!isConnected && (
          <EmptyState
            title="连接钱包以创建项目"
            description="Buyer 钱包将作为项目创建者并负责存入 USDC。"
            action={<ConnectButton />}
          />
        )}

        <fieldset
          disabled={!isConnected}
          className="space-y-6 disabled:opacity-50"
        >
          {/* Panel 1: Counterparties */}
          <Card className="space-y-4 p-5 md:p-6">
            <div>
              <p className="app-meta">步骤 1</p>
              <h2 className="mt-1 text-lg font-black text-white">对手方</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Seller 地址 *</Label>
                <span className="rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-400">
                  Demo 预填
                </span>
              </div>
              <Input
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                placeholder="0x..."
                className="font-mono text-xs sm:text-sm"
              />
            </div>
            {!showArbitrator ? (
              <button
                type="button"
                onClick={() => setShowArbitrator(true)}
                className="text-xs font-bold uppercase tracking-widest text-primary-500 hover:text-accent-400"
              >
                + 添加 Arbitrator（可选）
              </button>
            ) : (
              <div className="space-y-2">
                <Label>Arbitrator 地址</Label>
                <Input
                  value={arbitrator}
                  onChange={(e) => setArbitrator(e.target.value)}
                  placeholder="0x...（留空则不支持争议）"
                  className="font-mono text-xs sm:text-sm"
                />
              </div>
            )}
          </Card>

          {/* Panel 2: Milestones */}
          <Card className="space-y-4 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="app-meta">步骤 2</p>
                <h2 className="mt-1 text-lg font-black text-white">里程碑</h2>
              </div>
              <Button variant="outline" size="sm" onClick={addRow} type="button">
                <Plus className="h-3.5 w-3.5" />
                添加
              </Button>
            </div>

            <div className="space-y-3">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-2xl border border-white/5 bg-primary-950/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="app-meta">#{i + 1}</span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-primary-600 hover:text-red-400"
                        aria-label="删除里程碑"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Textarea
                    placeholder="描述（如：UI 概念稿完成）"
                    value={r.desc}
                    onChange={(e) => updRow(i, "desc", e.target.value)}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-primary-500">
                        金额 (USDC)
                      </Label>
                      <Input
                        value={r.amount}
                        onChange={(e) => updRow(i, "amount", e.target.value)}
                        placeholder="200"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-primary-500">
                        截止天数
                      </Label>
                      <Input
                        value={r.days}
                        onChange={(e) => updRow(i, "days", e.target.value)}
                        placeholder="7"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-sm text-primary-400">合计</span>
              <span className="text-xl font-black tabular-nums text-white">
                {total.toLocaleString()}{" "}
                <span className="text-sm font-bold text-primary-500">USDC</span>
              </span>
            </div>
          </Card>

          {/* Panel 3: Confirm */}
          <Card className="space-y-4 p-5 md:p-6">
            <div>
              <p className="app-meta">步骤 3</p>
              <h2 className="mt-1 text-lg font-black text-white">确认上链</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-primary-400">
              <span className="rounded-full border border-white/10 px-3 py-1">
                {rows.length} 个里程碑
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                {total.toLocaleString()} USDC
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Avalanche Fuji
              </span>
            </div>
            {hash && (
              <a
                href={snowtraceTx(hash)}
                target="_blank"
                rel="noreferrer"
                className="block font-mono text-xs text-accent-400 underline"
              >
                {hash.slice(0, 18)}…
              </a>
            )}
            <Button
              onClick={onCreate}
              disabled={!isConnected || isPending || confirming}
              size="lg"
              className="w-full animate-cta-pulse"
            >
              {isPending || confirming ? "确认中…" : "创建并上链"}
            </Button>
          </Card>
        </fieldset>
      </div>
    </AppShell>
  );
}
