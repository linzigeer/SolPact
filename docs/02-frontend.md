# 02 · Frontend 详细设计

> 历史原型参考文档：下文记录原有 EVM 实现。当前前端默认展示 Solana 迁移预览，旧前端模块位于 `web/legacy/evm/`；Solana 合约将另行重写。

> 目标：Frontend Dev 打开本文件，13:00 开始，17:00 前跑通 4 个页面 + 端到端。

## 1. 项目初始化（10 分钟）

```bash
cd .. # 回到项目根
npx create-next-app@latest web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd web

# 依赖
pnpm add wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
pnpm add lucide-react
pnpm add -D @types/node

# shadcn/ui
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button card input label textarea badge dialog toast sonner table
```

若 `pnpm` 没装：`npm i -g pnpm` 或用 `npm`/`yarn` 替换命令。

---

## 2. 目录结构

```
web/
├── app/
│   ├── layout.tsx              # RainbowKit + wagmi Provider
│   ├── page.tsx                # / Landing
│   ├── dashboard/
│   │   └── page.tsx            # /dashboard 项目列表
│   └── project/
│       ├── new/page.tsx        # /project/new 创建项目
│       └── [id]/page.tsx       # /project/[id] 项目详情
├── components/
│   ├── ConnectButton.tsx       # 包一层 RainbowKit
│   ├── MilestoneCard.tsx       # 单个里程碑操作卡
│   ├── ProjectStatusBadge.tsx  # 项目状态徽标
│   └── ui/                     # shadcn 生成的
├── lib/
│   ├── wagmi.ts                # wagmi config
│   ├── contracts.ts            # 合约地址 + ABI 导出
│   ├── abi/
│   │   ├── Escrow.json         # 从 forge 生成的 ABI
│   │   └── MockUSDC.json
│   └── format.ts               # 格式化工具（USDC 6 decimals 等）
├── providers.tsx               # Client-side 包装
└── .env.local
```

---

## 3. `lib/wagmi.ts`

```typescript
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalancheFuji } from "wagmi/chains";
import { http } from "wagmi";

export const config = getDefaultConfig({
  appName: "SolPact",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!, // https://cloud.walletconnect.com 免费
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
  },
  ssr: true,
});
```

---

## 4. `providers.tsx`

```typescript
"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { config } from "@/lib/wagmi";

const qc = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
          <Toaster richColors position="top-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

在 `app/layout.tsx` 里包住 `{children}`。

---

## 5. `lib/contracts.ts`

```typescript
import EscrowAbi from "./abi/Escrow.json";
import USDCAbi from "./abi/MockUSDC.json";

export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`;
export const USDC_ADDRESS   = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

export const escrowContract = {
  address: ESCROW_ADDRESS,
  abi: EscrowAbi.abi as any,
} as const;

export const usdcContract = {
  address: USDC_ADDRESS,
  abi: USDCAbi.abi as any,
} as const;

// 项目状态枚举（跟合约一致）
export const ProjectStatus = ["Created", "Funded", "Completed", "Cancelled"] as const;
export const MilestoneStatus = ["Pending", "Submitted", "Approved", "Disputed", "Refunded"] as const;
```

**ABI 从 Foundry 拿**：Solidity Dev 部署后跑 `cat contracts/out/Escrow.sol/Escrow.json | jq '{abi}' > web/lib/abi/Escrow.json`。

---

## 6. `lib/format.ts`

```typescript
import { formatUnits, parseUnits } from "viem";

export const fmtUSDC = (n: bigint) => `${Number(formatUnits(n, 6)).toLocaleString()} USDC`;
export const parseUSDC = (n: string | number) => parseUnits(String(n), 6);
export const shortAddr = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
export const fmtTime = (t: bigint) => new Date(Number(t) * 1000).toLocaleString();
```

---

## 7. 页面 1：`app/page.tsx`（Landing）

```typescript
"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gradient-to-b from-black to-slate-900 text-white">
      <h1 className="text-5xl font-bold text-center">SolPact</h1>
      <p className="text-xl text-slate-300 max-w-2xl text-center">
        Trustless milestone-based payments on Avalanche. Buyer locks USDC, seller delivers, code releases funds in 2 seconds.
      </p>
      <div className="flex gap-4 items-center">
        <ConnectButton />
        {isConnected && (
          <Button size="lg" onClick={() => router.push("/dashboard")}>Enter dApp →</Button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-6 mt-12 max-w-4xl">
        {[
          ["0% Platform Fee", "No middleman abstraction"],
          ["~2s Settlement", "Avalanche C-Chain finality"],
          ["<$0.01 Gas", "Compared to $2–20 on Ethereum"],
        ].map(([t, d]) => (
          <div key={t} className="p-6 border border-slate-700 rounded-xl">
            <div className="text-2xl font-bold">{t}</div>
            <div className="text-slate-400 mt-2">{d}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
```

---

## 8. 页面 2：`app/dashboard/page.tsx`（项目列表）

```typescript
"use client";
import { useAccount, usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { escrowContract } from "@/lib/contracts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtUSDC, shortAddr } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";

export default function Dashboard() {
  const { address } = useAccount();
  const client = usePublicClient();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!address || !client) return;
    (async () => {
      // 读取所有 ProjectCreated 事件里 buyer 或 seller 是当前用户的
      const logs = await client.getContractEvents({
        ...escrowContract,
        eventName: "ProjectCreated",
        fromBlock: 0n,
      });
      const mine = logs.filter(
        (l: any) => l.args.buyer?.toLowerCase() === address.toLowerCase() ||
                    l.args.seller?.toLowerCase() === address.toLowerCase()
      );
      // 拉每个项目的完整详情
      const details = await Promise.all(mine.map(async (l: any) => {
        const p = await client.readContract({
          ...escrowContract, functionName: "projects", args: [l.args.projectId],
        });
        return { id: l.args.projectId, ...p, role: l.args.buyer.toLowerCase() === address.toLowerCase() ? "Buyer" : "Seller" };
      }));
      setProjects(details);
    })();
  }, [address, client]);

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <Button onClick={() => router.push("/project/new")}>+ New Project</Button>
      </div>
      <div className="grid gap-4">
        {projects.map((p) => (
          <Card key={p.id.toString()} className="p-4 cursor-pointer hover:border-blue-500"
            onClick={() => router.push(`/project/${p.id}`)}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-mono text-sm text-slate-500">Project #{p.id.toString()}</div>
                <div className="mt-1">
                  You are: <span className="font-bold">{p.role}</span> ·
                  Counterparty: {shortAddr(p.role === "Buyer" ? p.seller : p.buyer)}
                </div>
                <div className="text-slate-400 text-sm">Total: {fmtUSDC(p.totalAmount)} · Released: {fmtUSDC(p.releasedAmount)}</div>
              </div>
              <ProjectStatusBadge status={p.status} />
            </div>
          </Card>
        ))}
        {projects.length === 0 && (
          <div className="text-center text-slate-400 py-12">No projects yet. Click "+ New Project" to create one.</div>
        )}
      </div>
    </main>
  );
}
```

**注意**：`getContractEvents` 从 block 0 拉在真正的链上会超时。Demo 用没问题，因为合约刚部署。生产环境要用 The Graph 或 Alchemy 索引，但这不在 MVP 范围。

---

## 9. 页面 3：`app/project/new/page.tsx`（创建项目）

```typescript
"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { escrowContract, usdcContract, USDC_ADDRESS } from "@/lib/contracts";
import { parseUSDC } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Row = { desc: string; amount: string; days: string };

export default function NewProject() {
  const { address } = useAccount();
  const router = useRouter();
  const [seller, setSeller] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [rows, setRows] = useState<Row[]>([{ desc: "", amount: "", days: "7" }]);
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const addRow = () => setRows([...rows, { desc: "", amount: "", days: "7" }]);
  const updRow = (i: number, k: keyof Row, v: string) => {
    const c = [...rows]; c[i][k] = v; setRows(c);
  };

  const onCreate = async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const descs = rows.map(r => r.desc);
      const amts = rows.map(r => parseUSDC(r.amount));
      const dls = rows.map(r => BigInt(now + Number(r.days) * 86400));

      const tx = await writeContractAsync({
        ...escrowContract,
        functionName: "createProject",
        args: [
          seller as `0x${string}`,
          (arbitrator || "0x0000000000000000000000000000000000000000") as `0x${string}`,
          USDC_ADDRESS,
          descs,
          amts,
          dls,
          BigInt(3 * 86400), // autoReleaseWindow = 3 days
        ],
      });
      toast.success(`Tx sent: ${tx.slice(0, 10)}…`);
      // 等确认后跳到 dashboard
      setTimeout(() => router.push("/dashboard"), 3000);
    } catch (e: any) {
      toast.error(e.shortMessage || e.message);
    }
  };

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create New Project</h1>
      <div className="space-y-2">
        <Label>Seller Address *</Label>
        <Input value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="0x..." />
      </div>
      <div className="space-y-2">
        <Label>Arbitrator Address (optional)</Label>
        <Input value={arbitrator} onChange={(e) => setArbitrator(e.target.value)} placeholder="0x... (leave empty for no dispute support)" />
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Milestones</Label>
          <Button variant="outline" size="sm" onClick={addRow}>+ Add Milestone</Button>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[3fr_1fr_1fr] gap-2 p-3 border rounded">
            <Textarea placeholder="Description (e.g., 'UI mockup done')" value={r.desc}
              onChange={(e) => updRow(i, "desc", e.target.value)} rows={2} />
            <div>
              <Label className="text-xs">Amount (USDC)</Label>
              <Input value={r.amount} onChange={(e) => updRow(i, "amount", e.target.value)} placeholder="500" />
            </div>
            <div>
              <Label className="text-xs">Deadline (days)</Label>
              <Input value={r.days} onChange={(e) => updRow(i, "days", e.target.value)} placeholder="7" />
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onCreate} disabled={isPending} size="lg" className="w-full">
        {isPending ? "Creating..." : "Create Project"}
      </Button>
    </main>
  );
}
```

---

## 10. 页面 4：`app/project/[id]/page.tsx`（项目详情 + 操作面板）

**这个页面是 Demo 的主战场，必须做好**。核心组件是 `MilestoneCard`。

```typescript
"use client";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";
import { escrowContract, usdcContract, ProjectStatus } from "@/lib/contracts";
import { fmtUSDC, shortAddr, fmtTime } from "@/lib/format";
import { ProjectStatusBadge } from "@/components/ProjectStatusBadge";
import { MilestoneCard } from "@/components/MilestoneCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = BigInt(params.id as string);
  const { address } = useAccount();

  const { data: project, refetch: refetchProject } = useReadContract({
    ...escrowContract, functionName: "projects", args: [projectId],
  });
  const { data: milestones, refetch: refetchMs } = useReadContract({
    ...escrowContract, functionName: "getMilestones", args: [projectId],
  });

  // 关键：订阅事件自动刷新
  useWatchContractEvent({
    ...escrowContract,
    onLogs: () => { refetchProject(); refetchMs(); },
  });

  const { writeContractAsync } = useWriteContract();

  if (!project) return <div className="p-8">Loading...</div>;

  const [buyer, seller, arbitrator, token, totalAmount, releasedAmount, status] = project as any;
  const isBuyer = address?.toLowerCase() === buyer.toLowerCase();
  const isSeller = address?.toLowerCase() === seller.toLowerCase();
  const isArbitrator = address?.toLowerCase() === arbitrator.toLowerCase();

  const onDeposit = async () => {
    try {
      // 1. approve USDC
      await writeContractAsync({
        ...usdcContract, functionName: "approve",
        args: [escrowContract.address, totalAmount],
      });
      toast.success("USDC approved. Confirming deposit...");
      // 2. deposit
      await writeContractAsync({
        ...escrowContract, functionName: "deposit", args: [projectId],
      });
      toast.success("Deposited!");
    } catch (e: any) { toast.error(e.shortMessage || e.message); }
  };

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-slate-500 font-mono">Project #{projectId.toString()}</div>
          <h1 className="text-3xl font-bold mt-1">
            {isBuyer ? "You (Buyer)" : shortAddr(buyer)} ⇄ {isSeller ? "You (Seller)" : shortAddr(seller)}
          </h1>
        </div>
        <ProjectStatusBadge status={status} />
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><div className="text-slate-500">Total</div><div className="font-bold text-lg">{fmtUSDC(totalAmount)}</div></div>
          <div><div className="text-slate-500">Released</div><div className="font-bold text-lg">{fmtUSDC(releasedAmount)}</div></div>
          <div><div className="text-slate-500">Arbitrator</div><div className="font-mono text-xs">{shortAddr(arbitrator)}</div></div>
        </div>
      </Card>

      {status === 0 /* Created */ && isBuyer && (
        <Button size="lg" className="w-full" onClick={onDeposit}>
          Deposit {fmtUSDC(totalAmount)} to Escrow →
        </Button>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Milestones</h2>
        {(milestones as any[])?.map((m, i) => (
          <MilestoneCard
            key={i}
            projectId={projectId}
            index={i}
            milestone={m}
            role={isBuyer ? "buyer" : isSeller ? "seller" : isArbitrator ? "arbitrator" : "viewer"}
            projectFunded={status >= 1}
          />
        ))}
      </div>
    </main>
  );
}
```

---

## 11. `components/MilestoneCard.tsx`（关键组件）

```typescript
"use client";
import { useState } from "react";
import { useWriteContract } from "wagmi";
import { escrowContract } from "@/lib/contracts";
import { fmtUSDC, fmtTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS = ["Pending", "Submitted", "Approved", "Disputed", "Refunded"];
const COLOR: Record<string, string> = {
  Pending: "bg-slate-500", Submitted: "bg-amber-500",
  Approved: "bg-emerald-500", Disputed: "bg-red-500", Refunded: "bg-slate-700",
};

export function MilestoneCard({ projectId, index, milestone, role, projectFunded }: any) {
  const [uri, setUri] = useState("");
  const [sellerShare, setSellerShare] = useState("5000");
  const { writeContractAsync, isPending } = useWriteContract();
  const statusName = STATUS[milestone.status];

  const call = async (fn: string, args: any[]) => {
    try {
      await writeContractAsync({ ...escrowContract, functionName: fn, args });
      toast.success(`${fn} sent!`);
    } catch (e: any) { toast.error(e.shortMessage || e.message); }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium">#{index + 1}. {milestone.description}</div>
          <div className="text-sm text-slate-500 mt-1">
            {fmtUSDC(milestone.amount)} · Deadline: {fmtTime(milestone.deadline)}
          </div>
          {milestone.deliverableURI && (
            <div className="text-xs text-blue-500 mt-1 break-all">
              Delivery: <a href={milestone.deliverableURI} target="_blank">{milestone.deliverableURI}</a>
            </div>
          )}
        </div>
        <Badge className={COLOR[statusName]}>{statusName}</Badge>
      </div>

      {/* Seller 提交交付 */}
      {role === "seller" && statusName === "Pending" && projectFunded && (
        <div className="flex gap-2">
          <Input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="Deliverable URL / IPFS CID" />
          <Button disabled={isPending || !uri} onClick={() => call("submitDelivery", [projectId, BigInt(index), uri])}>Submit</Button>
        </div>
      )}

      {/* Buyer 确认 */}
      {role === "buyer" && statusName === "Submitted" && (
        <div className="flex gap-2">
          <Button className="bg-emerald-600" disabled={isPending}
            onClick={() => call("approveMilestone", [projectId, BigInt(index)])}>
            ✓ Approve & Release {fmtUSDC(milestone.amount)}
          </Button>
          <Button variant="destructive" disabled={isPending}
            onClick={() => call("raiseDispute", [projectId, BigInt(index)])}>
            Raise Dispute
          </Button>
        </div>
      )}

      {/* Seller 也可以在提交后发起争议 */}
      {role === "seller" && statusName === "Submitted" && (
        <Button variant="outline" size="sm" disabled={isPending}
          onClick={() => call("claimAutoRelease", [projectId, BigInt(index)])}>
          Claim (if buyer unresponsive)
        </Button>
      )}

      {/* Buyer 逾期退款 */}
      {role === "buyer" && statusName === "Pending" && (
        <Button variant="outline" size="sm" disabled={isPending}
          onClick={() => call("refundOnDeadlineMiss", [projectId, BigInt(index)])}>
          Refund (if seller missed deadline)
        </Button>
      )}

      {/* Arbitrator 仲裁 */}
      {role === "arbitrator" && statusName === "Disputed" && (
        <div className="flex gap-2 items-center">
          <span className="text-sm">Seller share (bps, 0–10000):</span>
          <Input value={sellerShare} onChange={(e) => setSellerShare(e.target.value)} className="w-24" />
          <Button disabled={isPending}
            onClick={() => call("resolveDispute", [projectId, BigInt(index), BigInt(sellerShare)])}>
            Resolve
          </Button>
        </div>
      )}
    </Card>
  );
}
```

---

## 12. `components/ProjectStatusBadge.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
const S = [
  { name: "Created", color: "bg-slate-500" },
  { name: "Funded", color: "bg-blue-500" },
  { name: "Completed", color: "bg-emerald-600" },
  { name: "Cancelled", color: "bg-red-600" },
];
export function ProjectStatusBadge({ status }: { status: number }) {
  const s = S[status] || S[0];
  return <Badge className={s.color}>{s.name}</Badge>;
}
```

---

## 13. `.env.local`

```bash
NEXT_PUBLIC_WC_PROJECT_ID=<从 walletconnect cloud 拿>
NEXT_PUBLIC_ESCROW_ADDRESS=<部署后填>
NEXT_PUBLIC_USDC_ADDRESS=<部署后填>
```

---

## 14. 完成检查清单（Frontend Dev 交接前）

- [ ] `pnpm dev` 无 ts error / build error
- [ ] Landing 页能连接 **Avalanche Core**（RainbowKit → Core / WalletConnect）
- [ ] `/dashboard` 页面加载不崩（即使没数据也要显示 empty state）
- [ ] `/project/new` 能发起 create 交易
- [ ] `/project/[id]` 能读到项目状态并显示对应按钮
- [ ] 事件订阅生效：另一个钱包操作后本页面 3 秒内自动刷新
- [ ] 部署到 Vercel（见 `03-deployment.md`）
- [ ] Demo 页面路径整理成书签：Landing / Buyer Dashboard / Seller Dashboard
