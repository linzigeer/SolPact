"use client";

import { useEffect, useState } from "react";

export function DeadlineCountdown({ deadline }: { deadline: bigint }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = Number(deadline) * 1000 - now;
  if (left <= 0) {
    return <span className="font-medium text-red-400">已逾期</span>;
  }

  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);

  return (
    <span className="font-mono text-amber-400">
      剩余 {d}天 {h}时 {m}分 {s}秒
    </span>
  );
}
