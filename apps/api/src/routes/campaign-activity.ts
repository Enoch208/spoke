import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { activityItem } from "@spoke/protocol";
import { route, router } from "../http/router.js";
import { events } from "../db/schema.js";
import { ok } from "../http/respond.js";
import { actorView, eventTx } from "../services/evidence.js";
import { pageValues, stringListQuery } from "../services/read-utils.js";
import { viewerSession } from "../services/viewer.js";
import type { Services } from "../types.js";

export const campaignActivityRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  route(app, services, "GET", "/campaigns/:id/activity", "public", async (c) => {
    const campaign = await store.require("campaign", c.req.param("id") ?? "");
    const viewer = await viewerSession(c, services);
    const full = viewer?.address.toLowerCase() === campaign.owner;
    const kinds: Record<string, z.infer<typeof activityItem>["kind"]> = {
      NativePurchaseAccepted: "salePending",
      SaleFinalized: "saleFinalized",
      SaleRefunded: "saleRefunded",
      NodeCreated: "linkCreated",
      RewardClaimed: "claimed",
      MerchantProceedsClaimed: "claimed",
      CampaignFunded: "funded",
      PolicyVersionRegistered: "termsPublished",
    };
    const requested = c.req.query("kinds") ? stringListQuery(c.req.query("kinds") ?? "") : null;
    const rows = (
      await store.db
        .select()
        .from(events)
        .where(
          and(
            eq(events.chainId, chain.chainId),
            sql`${events.payload}->>'campaignId' = ${campaign.id}`,
          ),
        )
    )
      .filter(
        (event) =>
          (kinds[event.name] || event.name === "CampaignStatusChanged") &&
          (full ||
            ["NativePurchaseAccepted", "SaleFinalized", "SaleRefunded", "NodeCreated"].includes(
              event.name,
            )),
      )
      .sort((a, b) =>
        BigInt(a.blockNumber) > BigInt(b.blockNumber)
          ? -1
          : BigInt(a.blockNumber) < BigInt(b.blockNumber)
            ? 1
            : b.logIndex - a.logIndex,
      );
    const values = await Promise.all(
      rows.map(async (event) => {
        const kind =
          kinds[event.name] ??
          (event.payload.ended ? "ended" : event.payload.paused ? "paused" : "resumed");
        const who =
          event.payload.creator ??
          event.payload.owner ??
          event.payload.recipient ??
          event.payload.merchant ??
          campaign.owner;
        const actor = await actorView(store, z.string().parse(who), full);
        return {
          ...activityItem.parse({
            kind,
            actor,
            amount:
              event.payload.receivedAmount ?? event.payload.amount ?? event.payload.price ?? null,
            tx: eventTx(chain.chainId, event),
            at: event.at.toISOString(),
          }),
          id: event.id,
        };
      }),
    );
    const selected = requested ? values.filter((value) => requested.includes(value.kind)) : values;
    const page = pageValues(c, selected, (row) => row.id);
    return ok(c, { ...page, items: page.items.map((row) => activityItem.parse(row)) });
  });
  return app;
};
