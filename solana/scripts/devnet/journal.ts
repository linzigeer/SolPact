import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCAL_DIR } from "./environment";

export interface TransactionRecord {
  signature: string; status: "pending" | "passed" | "unexpected_failure";
  blockhash: string; lastValidBlockHeight: number; rawBase64: string;
  expectedError?: string; observedError?: string; slot?: number; blockTime?: number | null;
  feeLamports?: number; logs?: string[];
}
export interface ProjectRecord {
  idHex: string; address: string; vault: string; amounts: string[]; deadlines: number[];
  buyer: string; seller: string; arbitrator: string | null; window: number;
}
export interface RunState {
  runId: string; startedAt: string;
  transactions: Record<string, TransactionRecord>;
  projects: Record<string, ProjectRecord>;
  checks: Record<string, { passed: boolean; details: unknown; checkedAt: string }>;
  metadata: Record<string, unknown>;
}

export class Journal {
  readonly file = resolve(LOCAL_DIR, "run-state.json");
  readonly state: RunState;
  constructor() {
    this.state = existsSync(this.file) ? JSON.parse(readFileSync(this.file, "utf8")) : {
      runId: new Date().toISOString().replace(/[:.]/g, "-"), startedAt: new Date().toISOString(),
      transactions: {}, projects: {}, checks: {}, metadata: {},
    };
    this.save();
  }
  save() {
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.state, null, 2) + "\n", { mode: 0o600 });
    renameSync(`${this.file}.tmp`, this.file);
  }
  check(label: string, details: unknown) {
    this.state.checks[label] = { passed: true, details, checkedAt: new Date().toISOString() };
    this.save(); console.log(`CHECK ${label}`);
  }
}
