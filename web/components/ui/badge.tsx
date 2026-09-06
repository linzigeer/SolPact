import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-200",
        className
      )}
      {...props}
    />
  );
}
