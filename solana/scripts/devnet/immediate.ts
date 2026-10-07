import { DevnetClient } from "./client";
import { environment, verifyDeployment } from "./environment";
import { Journal } from "./journal";
import { immediateLifecycle, refundWhenDue } from "./lifecycle";

async function main() {
  const env = environment(); await verifyDeployment(env);
  const c = new DevnetClient(env, new Journal());
  await immediateLifecycle(c); await refundWhenDue(c);
}
main().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1; });
