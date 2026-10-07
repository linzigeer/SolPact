import { prepare } from "./prepare";
import { immediateLifecycle, refundWhenDue } from "./lifecycle";
import { securityCases } from "./security";
import { capacityFlow } from "./capacity";
import { finish } from "./finish";
import { environment, verifyDeployment } from "./environment";
import { Journal } from "./journal";
import { DevnetClient } from "./client";
import { writeReport } from "./report";
import { boundaryCases } from "./boundaries";

async function main() {
  const env = environment(); await verifyDeployment(env);
  const existing = new Journal();
  if (existing.state.checks["lifecycle-all-paths-completed"]) {
    await writeReport(new DevnetClient(env, existing), true); return;
  }
  const c = await prepare();
  await immediateLifecycle(c);
  await securityCases(c);
  await capacityFlow(c);
  await boundaryCases(c);
  await refundWhenDue(c);
  await finish(c, !process.argv.includes("--no-wait"));
}
main().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1; });
