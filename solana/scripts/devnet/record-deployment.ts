import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { environment, verifyDeployment } from "./environment";

async function main() {
  const signature = process.argv[2]; assert.ok(signature, "Pass the actual deployment transaction signature");
  const env = environment(), deployment = await verifyDeployment(env);
  const tx = await env.connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  assert.ok(tx?.meta && !tx.meta.err, "Deployment transaction is missing or failed");
  assert.equal(tx.slot.toString(), deployment.deploymentSlot, "Signature does not identify the current deployment slot");
  assert.ok(tx.transaction.message.staticAccountKeys.some(key => key.toBase58() === deployment.programId));
  const record = { network: "devnet", ...deployment, deploymentSignature: signature,
    blockTime: tx.blockTime, recordedAt: new Date().toISOString() };
  mkdirSync("deployments", { recursive: true });
  writeFileSync("deployments/devnet-deployment.json", JSON.stringify(record, null, 2) + "\n");
  console.log(JSON.stringify(record, null, 2));
}
main().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1; });
