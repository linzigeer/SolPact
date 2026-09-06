import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "app-panel flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      <p className="text-xl font-black tracking-tight text-white">{title}</p>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-400">
          {description}
        </p>
      )}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
