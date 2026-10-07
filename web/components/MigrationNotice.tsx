import { SOLANA_MIGRATION_NOTICE, SOLANA_NETWORK_LABEL } from "@/lib/network";

export function MigrationNotice() {
  return (
    <div className="rounded-2xl border border-accent-500/30 bg-accent-500/10 px-5 py-4 text-sm leading-relaxed text-primary-300">
      <p className="mb-1 font-bold text-accent-400">{SOLANA_NETWORK_LABEL} · 版本预览</p>
      <p>{SOLANA_MIGRATION_NOTICE}</p>
    </div>
  );
}
