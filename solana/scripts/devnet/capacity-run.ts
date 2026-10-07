import { DevnetClient } from "./client";
import { environment, verifyDeployment } from "./environment";
import { Journal } from "./journal";
import { capacityFlow } from "./capacity";

async function main() {
  const env = environment(); await verifyDeployment(env);
  await capacityFlow(new DevnetClient(env, new Journal()));
}
main().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1; });
