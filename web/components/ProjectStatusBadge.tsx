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
