import { z } from "zod";
import { campaignDistributorRow } from "@spoke/protocol";
import { merchantFor, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { allRecords, pageValues } from "../services/read-utils.js";
import { partnerView } from "../services/partners.js";
import { descendantsOf } from "../services/graph.js";
import type { Services } from "../types.js";

export const participantRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  route(app, services, "GET", "/merchant/campaigns/:id/distributors", "merchant", async (c) => {
    const merchant = await merchantFor(c, services);
    const id = c.req.param("id") ?? "";
    await store.require("campaign", id, z.string().parse(merchant.payload.address).toLowerCase());
    const nodes = (await allRecords(store, "node")).filter((row) => row.payload.campaignId === id);
    const rows = await Promise.all(
      nodes.map(async (node) => {
        const { detail } = await partnerView(
          services,
          z.string().parse(node.payload.creator),
          new Set([id]),
        );
        const invitation = (await allRecords(store, "invitation", merchant.id)).find(
          (row) =>
            row.payload.campaignId === id &&
            z.string().parse(row.payload.distributor).toLowerCase() === node.owner,
        );
        return campaignDistributorRow.parse({
          address: node.payload.creator,
          handle: detail.partner.handle,
          parentNodeId: node.payload.parentId,
          nodeId: node.id,
          linkCount: 1,
          descendants: descendantsOf(nodes, node.id).length,
          directSales: detail.partner.directSales,
          paidSales: detail.partner.settledConversions ?? 0,
          rewards: detail.rewards,
          lastActivityAt: detail.partner.lastSettledAt ?? detail.partner.firstLinkAt,
          invitationStatus: invitation?.payload.status ?? null,
        });
      }),
    );
    rows.sort((a, b) => b.paidSales - a.paidSales || a.address.localeCompare(b.address));
    return ok(
      c,
      pageValues(c, rows, (row) => row.nodeId),
    );
  });
  return app;
};
