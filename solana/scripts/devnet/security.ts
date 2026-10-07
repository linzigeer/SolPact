import assert from "node:assert/strict";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ata, bn, DevnetClient, status } from "./client";
import { payment, rejection } from "./checks";
import { chainTime, MINT } from "./environment";

export async function securityCases(c: DevnetClient) {
  if (c.journal.state.checks["security-suite-completed"]) return;
  const { buyer, seller, arbitrator, stranger } = c.env;
  const now = await chainTime(c.env.connection);
  const honest = c.journal.state.projects.lifecycle;

  // An unfunded project from another buyer must never withdraw honest funds.
  const unfunded = c.plan("unfunded", [1000n], [now + 60], { buyer: stranger });
  await c.ready("unfunded", unfunded);
  await rejection(c, "security/unfunded-refund", honest, () =>
    c.settle("security/unfunded-refund", unfunded, "refundOnDeadlineMiss", 0, stranger, 7000, "NotFunded"));
  await rejection(c, "security/unfunded-other-vault", honest, () =>
    c.settle("security/unfunded-other-vault", unfunded, "refundOnDeadlineMiss", 0, stranger, 7000, "InvalidVault", { vault: new PublicKey(honest.vault) }));
  c.journal.check("unfunded-buyer-received-no-tokens", { balanceBaseUnits: (await c.balance(ata(stranger.publicKey))).toString() });
  assert.equal(await c.balance(ata(stranger.publicKey)), 0n);

  // Also exercise substitutions when both projects are legitimately funded.
  const isolated = c.plan("isolation", [1000n], [now + 1200]);
  await c.ready("isolation", isolated); await c.deposit("isolation/deposit", isolated);
  await c.act("isolation/submit", isolated, "submitDelivery", 0, seller);
  for (const [label, overrides, error] of [
    ["foreign-vault", { vault: new PublicKey(honest.vault) }, "InvalidVault"],
    ["foreign-milestone", { milestone: c.milestone(honest, 0) }, "ConstraintSeeds"],
    ["foreign-seller", { sellerAta: ata(stranger.publicKey) }, "InvalidRecipient"],
    ["foreign-buyer", { buyerAta: ata(stranger.publicKey) }, "InvalidRecipient"],
    ["recipient-alias", { sellerAta: ata(buyer.publicKey) }, "InvalidRecipient"],
    ["token-2022", { tokenProgram: TOKEN_2022_PROGRAM_ID }, "InvalidProgramId"],
  ] as [string, Record<string, PublicKey>, string][]) {
    await rejection(c, `security/${label}`, isolated, () => c.settle(`security/${label}`, isolated,
      "approveMilestone", 0, buyer, 7000, error, overrides));
  }
  await payment(c, "isolation/approve", isolated, "approveMilestone", 0, buyer, 1000n, 0n);

  const noArbitrator = c.plan("no-arbitrator", [3n], [now + 1200], { arbitrator: null });
  await c.ready("no-arbitrator", noArbitrator); await c.deposit("no-arbitrator/deposit", noArbitrator);
  await rejection(c, "security/buyer-submission", noArbitrator, () =>
    c.act("security/buyer-submission", noArbitrator, "submitDelivery", 0, buyer, "Unauthorized"));
  await rejection(c, "security/empty-uri", noArbitrator, () =>
    c.act("security/empty-uri", noArbitrator, "submitDelivery", 0, seller, "EmptyUri", " "));
  await rejection(c, "security/oversized-uri", noArbitrator, () =>
    c.act("security/oversized-uri", noArbitrator, "submitDelivery", 0, seller, "TextTooLong", "中".repeat(86)));
  await c.act("no-arbitrator/submit", noArbitrator, "submitDelivery", 0, seller);
  await rejection(c, "security/no-arbitrator", noArbitrator, () =>
    c.act("security/no-arbitrator", noArbitrator, "raiseDispute", 0, buyer, "NoArbitrator"));
  await payment(c, "no-arbitrator/approve", noArbitrator, "approveMilestone", 0, buyer, 3n, 0n);

  const rounding = c.plan("rounding", [3n], [now + 1200]);
  await c.ready("rounding", rounding); await c.deposit("rounding/deposit", rounding);
  await c.act("rounding/submit", rounding, "submitDelivery", 0, seller);
  await c.act("rounding/dispute", rounding, "raiseDispute", 0, seller);
  await payment(c, "rounding/arbitrate", rounding, "resolveDispute", 0, arbitrator, 0n, 3n, 3333);

  // Invalid creates leave neither a project nor its vault behind.
  for (const [name, count, window, actorSeller, arb, error] of [
    ["zero-count", 0, 3600, seller.publicKey, arbitrator.publicKey, "InvalidMilestoneCount"],
    ["too-many", 21, 3600, seller.publicKey, arbitrator.publicKey, "InvalidMilestoneCount"],
    ["short-window", 1, 3599, seller.publicKey, arbitrator.publicKey, "InvalidWindow"],
    ["long-window", 1, 7_776_001, seller.publicKey, arbitrator.publicKey, "InvalidWindow"],
    ["self-seller", 1, 3600, buyer.publicKey, arbitrator.publicKey, "InvalidRole"],
    ["self-arbitrator", 1, 3600, seller.publicKey, buyer.publicKey, "InvalidRole"],
  ] as [string, number, number, PublicKey, PublicKey, string][]) {
    const ref = c.plan(`invalid-${name}`, [1n], [now + 1200]);
    const ix = await c.ix("createProject", [Array.from(Buffer.from(ref.idHex, "hex")), actorSeller, arb, count, bn(window)], {
      buyer: buyer.publicKey, project: new PublicKey(ref.address), mint: MINT, vault: new PublicKey(ref.vault),
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
    });
    await c.tx.send(`security/create-${name}`, [c.ataIx(new PublicKey(ref.address), buyer.publicKey), ix], [buyer], error);
    assert.equal(await c.env.connection.getAccountInfo(new PublicKey(ref.address)), null);
    assert.equal(await c.env.connection.getAccountInfo(new PublicKey(ref.vault)), null);
    c.journal.check(`security/create-${name}`, { error, noProjectOrVaultCreated: true });
  }

  const invalidAppend = c.plan("invalid-append", [1n], [now + 1200]);
  await c.create("invalid-append", invalidAppend);
  await rejection(c, "security/incomplete-finalize", invalidAppend, () =>
    c.manage("security/incomplete-finalize", invalidAppend, "finalizeProject", "IncompleteProject"));
  for (const [name, index, amount, deadline, text, error] of [
    ["gap", 1, 1n, now + 1200, "x", "InvalidIndex"],
    ["zero", 0, 0n, now + 1200, "x", "ZeroAmount"],
    ["past", 0, 1n, now - 1, "x", "DeadlinePassed"],
    ["long-description", 0, 1n, now + 1200, "中".repeat(86), "TextTooLong"],
  ] as const) {
    await rejection(c, `security/append-${name}`, invalidAppend, async () => c.tx.send(`security/append-${name}`,
      [await c.ix("addMilestone", [index, bn(amount), bn(deadline), text], {
        buyer: buyer.publicKey, project: new PublicKey(invalidAppend.address), milestone: c.milestone(invalidAppend, index),
        systemProgram: SystemProgram.programId,
      })], [buyer], error));
  }
  await c.manage("invalid-append/cancel", invalidAppend, "cancelProject");
  assert.equal(status((await c.project(invalidAppend)).status), "cancelled");
  const cancelledCreated = c.plan("cancel-created", [1n], [now + 1200]);
  await c.ready("cancel-created", cancelledCreated);
  await rejection(c, "security/nonbuyer-cancel", cancelledCreated, () =>
    c.manage("security/nonbuyer-cancel", cancelledCreated, "cancelProject", "Unauthorized", stranger));
  await c.manage("cancel-created/cancel", cancelledCreated, "cancelProject");
  await rejection(c, "security/cancelled-deposit", cancelledCreated, () =>
    c.deposit("security/cancelled-deposit", cancelledCreated, "InvalidProjectState"));
  assert.equal(status((await c.project(cancelledCreated)).status), "cancelled");
  c.journal.check("security-suite-completed", { checkedOnChain: true });
}
