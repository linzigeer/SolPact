import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chainTime, environment, LOCAL_DIR, PROGRAM_ID } from "./environment";
import type { RunState } from "./journal";

async function main() {
  const env = environment();
  const state = JSON.parse(readFileSync(resolve(LOCAL_DIR, "run-state.json"), "utf8")) as RunState;
  const now = await chainTime(env.connection);
  const schedule = state.metadata.autoRelease as { unlockAt: number } | undefined;
  const txs = Object.entries(state.transactions);
  console.log(JSON.stringify({ programId: PROGRAM_ID.toBase58(), runId: state.runId, chainTime: now,
    confirmedTests: txs.filter(([, value]) => value.status === "passed").length,
    expectedRejections: txs.filter(([, value]) => value.status === "passed" && value.expectedError).length,
    pending: txs.filter(([, value]) => value.status === "pending").map(([label]) => label),
    unexpectedFailures: txs.filter(([, value]) => value.status === "unexpected_failure").map(([label]) => label),
    remainingSeconds: schedule ? Math.max(0, schedule.unlockAt - now) : null,
    allFlowsCompleted: !!state.checks["lifecycle-all-paths-completed"],
  }, null, 2));
}
main().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1; });
