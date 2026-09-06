"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { escrowContract, USDC_ADDRESS } from "@/lib/contracts";
import { parseUSDC } from "@/lib/format";
import { snowtraceTx } from "@/lib/explorer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [rows, setRows] = useState<Row[]>([
    { desc: "UI Design mockup", amount: "200", days: "7" },
    { desc: "Frontend implementation", amount: "300", days: "14" },
  ]);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash });

  const addRow = () => setRows([...rows, { desc: "", amount: "", days: "7" }]);
  const updRow = (i: number, k: keyof Row, v: string) => {
    const c = [...rows];
    c[i][k] = v;
    setRows(c);
  };

  const onCreate = async () => {
    if (!isAddress(seller)) {
      toast.error("Invalid seller address");
      return;
    }
    if (arbitrator && !isAddress(arbitrator)) {
      toast.error("Invalid arbitrator address");
      return;
    }
    if (rows.some((r) => !r.desc || !r.amount || !r.days)) {
      toast.error("Fill all milestone fields");
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

      toast.success(`Tx sent: ${tx.slice(0, 10)}…`, {
        action: {
          label: "Snowtrace",
          onClick: () => window.open(snowtraceTx(tx), "_blank"),
        },
      });
      setTimeout(() => router.push("/dashboard"), 3500);
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      toast.error(err.shortMessage || err.message || "Create failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-emerald-400 hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold mt-1">Create New Project</h1>
          </div>
          <ConnectButton />
        </div>

        {!isConnected && (
          <div className="text-slate-400">Connect wallet to create a project.</div>
        )}

        <div className="space-y-2">
          <Label>Seller Address *</Label>
          <Input
            value={seller}
            onChange={(e) => setSeller(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="space-y-2">
          <Label>Arbitrator Address (optional)</Label>
          <Input
            value={arbitrator}
            onChange={(e) => setArbitrator(e.target.value)}
            placeholder="0x... (leave empty for no dispute support)"
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Milestones</Label>
            <Button variant="outline" size="sm" onClick={addRow}>
              + Add Milestone
            </Button>
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-[3fr_1fr_1fr] gap-2 p-3 border border-slate-700 rounded-lg"
            >
              <Textarea
                placeholder="Description (e.g., UI mockup done)"
                value={r.desc}
                onChange={(e) => updRow(i, "desc", e.target.value)}
                rows={2}
              />
              <div>
                <Label className="text-xs">Amount (USDC)</Label>
                <Input
                  value={r.amount}
                  onChange={(e) => updRow(i, "amount", e.target.value)}
                  placeholder="500"
                />
              </div>
              <div>
                <Label className="text-xs">Deadline (days)</Label>
                <Input
                  value={r.days}
                  onChange={(e) => updRow(i, "days", e.target.value)}
                  placeholder="7"
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={onCreate}
          disabled={!isConnected || isPending || confirming}
          size="lg"
          className="w-full"
        >
          {isPending || confirming ? "Creating…" : "Create Project"}
        </Button>
      </div>
    </main>
  );
}
