import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { DevnetClient } from "./client";

/** Decode logs from successful, confirmed program transactions with the deployed IDL. */
export function auditEvents(c: DevnetClient) {
  const events = Object.entries(c.journal.state.transactions)
    .filter(([, tx]) => tx.status === "passed" && !tx.expectedError)
    .flatMap(([label, tx]) => (tx.logs ?? []).filter(line => line.startsWith("Program data: "))
      .map(line => ({ label, event: c.program.coder.events.decode(line.slice("Program data: ".length)) })))
    .filter(entry => entry.event !== null);
  const projectCounts = [];
  for (const name of ["lifecycle", "capacity", "isolation", "no-arbitrator", "rounding"]) {
    const ref = c.journal.state.projects[name]; assert.ok(ref);
    const own = events.filter(({ event }) => event?.data.project instanceof PublicKey && event.data.project.toBase58() === ref.address);
    const settlements = own.filter(({ event }) => event?.name === "milestoneSettled");
    assert.equal(settlements.length, ref.amounts.length, `${name}: exactly one settlement event per milestone`);
    assert.equal(new Set(settlements.map(({ event }) => event!.data.index)).size, ref.amounts.length);
    assert.equal(own.filter(({ event }) => event?.name === "projectCompleted").length, 1);
    projectCounts.push({ name, settlementEvents: settlements.length, completedEvents: 1 });
  }
  c.journal.check("events-no-duplicate-settlements", projectCounts);
}
