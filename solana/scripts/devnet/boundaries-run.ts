import { DevnetClient } from "./client";
import { boundaryCases } from "./boundaries";
import { environment, verifyDeployment } from "./environment";
import { Journal } from "./journal";

(async () => {
  const env = environment(); await verifyDeployment(env);
  await boundaryCases(new DevnetClient(env, new Journal()));
})().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1; });
