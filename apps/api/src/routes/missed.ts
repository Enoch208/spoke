import { z } from "zod";
import { missedEarning } from "@spoke/protocol";
import { accountId, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { ApiProblem } from "../http/problem.js";
import { allRecords, pageValues, timestamp } from "../services/read-utils.js";
import { allocations, ancestry } from "../services/views.js";
import { receiptEvidence, eventTx } from "../services/evidence.js";
import type { Services } from "../types.js";

export const missedRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  route(app, services, "GET", "/me/earnings/missed", "session", async (c) => {
    const wallets = new Set((await allRecords(store, "wallet", accountId(c))).map((row) => row.id));
    const receipts = (await allRecords(store, "receipt")).filter(
      (row) =>
        (!c.req.query("campaignId") || row.payload.campaignId === c.req.query("campaignId")) &&
        (!c.req.query("nodeId") || row.payload.nodeId === c.req.query("nodeId")),
    );
    const rows = [];
    for (const receipt of receipts) {
      const path = await ancestry(store, z.string().parse(receipt.payload.nodeId));
      const split = allocations.parse(receipt.payload.allocations);
      const campaign = await store.require(
        "campaign",
        z.string().parse(receipt.payload.campaignId),
      );
      const version = await store.get(
        "policy-version",
        `${campaign.id}_${String(receipt.payload.policyVersion)}`,
      );
      const policy =
        version?.payload ??
        (z.object({ version: z.number().int() }).parse(campaign.payload.policy).version ===
        receipt.payload.policyVersion
          ? campaign.payload.policy
          : null);
      if (!policy)
        throw new ApiProblem(
          503,
          "INDEXER_LAGGING",
          "The purchase policy is still being indexed.",
          true,
        );
      const max = z
        .object({ maxRewardedAncestors: z.number().int() })
        .parse(policy).maxRewardedAncestors;
      const evidence = (await receiptEvidence(store, chain.chainId, receipt.id)).map((event) =>
        eventTx(chain.chainId, event),
      );
      for (const [index, node] of path.rows.entries()) {
        if (!wallets.has(node.owner)) continue;
        const paid = split.some(
          (allocation) =>
            allocation.depth === index && allocation.recipient.toLowerCase() === node.owner,
        );
        if (paid && receipt.payload.status !== 2) continue;
        rows.push(
          missedEarning.parse({
            kind: "sale",
            reason: receipt.payload.status === 2 ? "REFUNDED" : "OUTSIDE_DEPTH",
            campaignId: receipt.payload.campaignId,
            nodeId: node.id,
            saleId: receipt.id,
            position: index + 1,
            maxRewardedAncestors: max,
            ruleLabel: paid ? null : `Only the nearest ${String(max)} eligible people are paid.`,
            at: timestamp(receipt.payload.purchasedAt),
            evidence,
          }),
        );
      }
    }
    return ok(
      c,
      pageValues(c, rows, (row) => `${"saleId" in row ? row.saleId : row.at}_${row.nodeId}`),
    );
  });
  return app;
};
