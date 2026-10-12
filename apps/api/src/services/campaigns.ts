import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  campaignDetail,
  merchantCampaignRow,
  simulatePolicy,
  commissionPolicy,
} from "@spoke/protocol";
import type { Services } from "../types.js";
import type { StoredRecord } from "../db/store.js";
import { events } from "../db/schema.js";
import { ApiProblem } from "../http/problem.js";
import { eventTx } from "./evidence.js";
import { campaignCard, campaignProduct, statsView } from "./views.js";
import { policyView, wire } from "./chain.js";
import { timestamp } from "./read-utils.js";

export const detailView = async (services: Services, row: StoredRecord) => {
  const { store, chain } = services;
  const head = await chain.head();
  const fresh = await chain.campaign(row.id, BigInt(head.blockNumber));
  const projected = {
    ...row,
    payload: {
      ...row.payload,
      ...z.record(z.string(), z.unknown()).parse(wire(fresh.campaign)),
      policy: policyView(fresh.currentPolicy),
      rewardLedger: wire(fresh.rewards),
      proceedsLedger: wire(fresh.proceeds),
    },
  };
  const [card, item, stats, proofs] = await Promise.all([
    campaignCard(store, projected),
    campaignProduct(store, row),
    statsView(store, row.id),
    store.db
      .select()
      .from(events)
      .where(
        and(eq(events.chainId, chain.chainId), sql`${events.payload}->>'campaignId' = ${row.id}`),
      ),
  ]);
  const creation = proofs.find((event) => event.name === "CampaignCreated");
  if (!creation)
    throw new ApiProblem(
      503,
      "INDEXER_LAGGING",
      "Campaign creation evidence has not been indexed yet.",
      true,
    );
  return {
    blockNumber: head.blockNumber,
    detail: campaignDetail.parse({
      ...card,
      product: item,
      rewardLedger: wire(fresh.rewards),
      proceedsLedger: wire(fresh.proceeds),
      startsAt: timestamp(row.payload.createdAt),
      endsAt: timestamp(fresh.campaign.endsAt.toString()),
      counts: stats.sales,
      nodeCount: stats.links,
      inviteOnly: false,
      moderation: { hidden: false, reason: null },
      capacity: { nodes: 256, sales: 100 },
      trustMode: "NATIVE_ONCHAIN",
      creationTx: eventTx(chain.chainId, creation),
      fundingTxs: proofs
        .filter((event) => event.name === "CampaignFunded")
        .map((event) => eventTx(chain.chainId, event)),
      indexedAt: row.payload.indexedAt ?? null,
    }),
  };
};
export const merchantCampaignView = async (services: Services, row: StoredRecord) => {
  const card = await campaignCard(services.store, row);
  const stats = await statsView(services.store, row.id);
  const settings = await services.store.get("campaign-settings", row.id);
  return merchantCampaignRow.parse({
    campaignId: row.id,
    draftId: null,
    state: card.state,
    productTitle: card.product.title,
    rewardPerSale: simulatePolicy(
      BigInt(card.price),
      commissionPolicy.strip().parse(card.policy),
      card.policy.maxRewardedAncestors,
    ).reserved.toString(),
    policy: card.policy,
    source: "NATIVE_ONCHAIN",
    trustMode: "NATIVE_ONCHAIN",
    eligibility: "open",
    availableRewards: card.rewardAvailable,
    pendingSales: stats.sales.pending,
    proceedsClaimable: z.object({ proceedsClaimable: z.string() }).parse(row.payload.proceedsLedger)
      .proceedsClaimable,
    sales: stats.sales,
    links: stats.links,
    budgetAlertSales: settings?.payload.budgetAlertSales ?? 5,
    endsAt: timestamp(row.payload.endsAt),
    scheduledPolicyHash: row.payload.scheduledPolicy
      ? z.object({ policyHash: z.string() }).parse(row.payload.scheduledPolicy).policyHash
      : null,
  });
};
