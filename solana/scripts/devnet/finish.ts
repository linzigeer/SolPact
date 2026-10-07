import assert from "node:assert/strict";
import { DevnetClient, status } from "./client";
import { rejection } from "./checks";
import { chainTime, delay, environment, verifyDeployment } from "./environment";
import { Journal } from "./journal";
import { autoReleaseWhenDue, refundWhenDue } from "./lifecycle";
import { writeReport } from "./report";

export async function finish(c: DevnetClient, wait: boolean) {
  const unfunded = c.journal.state.projects.unfunded;
  assert.ok(unfunded && c.journal.state.checks["security-suite-completed"] && c.journal.state.checks["capacity-20-completed"]
    && c.journal.state.checks["boundary-suite-completed"], "Complete security, capacity and boundary phases first");
  if (!c.journal.state.checks["expired-unfunded-regression"]) {
    assert.ok(await chainTime(c.env.connection) > unfunded.deadlines[0]);
    await rejection(c, "expired-unfunded-regression", c.journal.state.projects.lifecycle, () =>
      c.settle("expired-unfunded-regression", unfunded, "refundOnDeadlineMiss", 0, c.env.stranger, 7000, "NotFunded"));
  }
  await c.manage("unfunded/cancel", unfunded, "cancelProject");
  assert.equal(status((await c.project(unfunded)).status), "cancelled");
  await refundWhenDue(c);
  await writeReport(c, false);
  for (;;) {
    const result = await autoReleaseWhenDue(c);
    console.log(`AUTO_RELEASE ${JSON.stringify(result)}`);
    if (result.done) { await writeReport(c, true); return true; }
    if (!wait) return false;
    await delay(Math.min(30_000, Math.max(1000, result.remainingSeconds * 1000)));
  }
}

if (require.main === module) {
  (async () => {
    const env = environment(); await verifyDeployment(env);
    await finish(new DevnetClient(env, new Journal()), process.argv.includes("--wait"));
  })().catch(error => { console.error(String(error.message).replace(/https?:\/\/\S+/g, "[RPC]")); process.exitCode = 1; });
}
