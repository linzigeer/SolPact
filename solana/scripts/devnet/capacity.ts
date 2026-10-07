import assert from "node:assert/strict";
import { DevnetClient, status } from "./client";
import { payment, rejection } from "./checks";
import { chainTime } from "./environment";

export async function capacityFlow(c: DevnetClient) {
  if (c.journal.state.checks["capacity-20-completed"]) return;
  const now = await chainTime(c.env.connection);
  const ref = c.plan("capacity", Array.from({ length: 20 }, (_, index) => BigInt(index + 1)), Array(20).fill(now + 3600));
  await c.create("capacity", ref);
  for (let index = 0; index < 10; index++) await c.add("capacity", ref, index, "x".repeat(256));
  await rejection(c, "capacity/reject-incomplete-finalize", ref, () =>
    c.manage("capacity/reject-incomplete-finalize", ref, "finalizeProject", "IncompleteProject"));
  // Reconstruct the client, then recover the append cursor from the RPC account.
  const resumed = new DevnetClient(c.env, c.journal);
  const count = (await resumed.project(ref)).milestoneCount;
  assert.ok(count >= 10 && count <= 20);
  for (let index = count; index < 20; index++) await resumed.add("capacity", ref, index, "中".repeat(85));
  await resumed.manage("capacity/finalize", ref, "finalizeProject");
  await resumed.deposit("capacity/deposit", ref);
  for (let index = 19; index >= 0; index--) {
    await resumed.act(`capacity/submit/${index}`, ref, "submitDelivery", index, c.env.seller, undefined, "u".repeat(256));
    await payment(resumed, `capacity/approve/${index}`, ref, "approveMilestone", index, c.env.buyer, BigInt(index + 1), 0n);
  }
  const project = await c.project(ref);
  assert.equal(status(project.status), "completed"); assert.equal(project.settledCount, 20);
  c.journal.check("capacity-20-completed", await c.conserved(ref));
}
