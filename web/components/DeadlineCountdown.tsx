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
    return <span className="text-red-400 font-medium">Overdue</span>;
  }

  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);

  return (
    <span className="text-amber-400 font-mono">
      {d}d {h}h {m}m {s}s left
    </span>
  );
}
