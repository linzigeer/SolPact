import { Badge } from "@/components/ui/badge";

const S = [
  {
    name: "已创建",
    color: "border-primary-500/40 bg-primary-800/60 text-primary-300",
  },
  {
    name: "已托管",
    color: "border-accent-500/40 bg-accent-500/10 text-accent-400",
  },
  {
    name: "已完成",
    color: "border-green-500/40 bg-green-500/10 text-green-400",
  },
  {
    name: "已取消",
    color: "border-red-500/40 bg-red-500/10 text-red-400",
  },
];

export function ProjectStatusBadge({ status }: { status: number }) {
  const s = S[status] || S[0];
  return <Badge className={s.color}>{s.name}</Badge>;
}
