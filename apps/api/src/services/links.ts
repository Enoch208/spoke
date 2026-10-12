import { z } from "zod";
import {
  linkRow,
  linkStats,
  referralResolution,
  simulatePolicy,
  commissionPolicy,
} from "@spoke/protocol";
import type { Services } from "../types.js";
import type { StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { counts, relatedRecords, timestamp, zeroBuckets } from "./read-utils.js";
import { allocations, ancestry, campaignCard } from "./views.js";
import { actorView } from "./evidence.js";
import { descendantsOf, pathView } from "./graph.js";
import { allocationBucket } from "./earnings.js";
import { events } from "../db/schema.js";
import { and, eq, sql } from "drizzle-orm";

export const ensureLink = async (services: Services, node: StoredRecord) => {
  const previous = await services.store.get("link", node.id);
  if (previous) return previous;
  const owner = (await services.store.identity("wallet", node.owner)) ?? node.owner;
  const code = `${String(services.chain.chainId)}-${node.id}`;
  return services.store.put("link", node.id, owner, {
    nodeId: node.id,
    code,
    url: `${services.webOrigin}/r/${code}`,
    campaignId: node.payload.campaignId,
    parentNodeId: node.payload.parentId,
    retired: false,
    visitsEstimate: 0,
  });
};
export const linkView = async (services: Services, node: StoredRecord) => {
  const { store, chain } = services;
  const link = await ensureLink(services, node);
  const campaign = await store.require("campaign", z.string().parse(node.payload.campaignId));
  const card = await campaignCard(store, campaign);
  const path = await ancestry(store, node.id);
  const receipts = await relatedRecords(store, "receipt", "campaignId", campaign.id);
  const earned = zeroBuckets();
  const cursor = await store.get("indexer", "cursor");
  const at = cursor?.payload.blockTimestamp
    ? BigInt(z.string().parse(cursor.payload.blockTimestamp))
    : (
        await chain.client.getBlock(
          cursor ? { blockNumber: BigInt(z.string().parse(cursor.payload.blockNumber)) } : {},
        )
      ).timestamp;
  for (const row of receipts) {
    const split = allocations.parse(row.payload.allocations);
    const index = split.findIndex((item) => item.recipient.toLowerCase() === node.owner);
    const allocation = split[index];
    if (!allocation) continue;
    const bucket = allocationBucket(row, index, at);
    earned[bucket] = (BigInt(earned[bucket]) + BigInt(allocation.amount)).toString();
  }
  const [created] = await store.db
    .select()
    .from(events)
    .where(
      and(
        eq(events.chainId, chain.chainId),
        eq(events.name, "NodeCreated"),
        sql`${events.payload}->>'nodeId' = ${node.id}`,
      ),
    )
    .limit(1);
  if (!created)
    throw new ApiProblem(
      503,
      "INDEXER_LAGGING",
      "Link creation evidence has not been indexed yet.",
      true,
    );
  return linkRow.parse({
    ...link.payload,
    campaign: card,
    levelFromMerchant: path.rows.length,
    campaignStatus: card.state,
    moderation: { state: "visible", reason: null, decidedAt: null },
    conversions: receipts.filter(
      (receipt) => receipt.payload.nodeId === node.id && receipt.payload.status === 3,
    ).length,
    earned,
    createdTxHash: created.txHash,
    createdAt: timestamp(node.payload.createdAt),
  });
};
export const linkStatsView = async (services: Services, node: StoredRecord) => {
  const rows = await relatedRecords(
    services.store,
    "node",
    "campaignId",
    z.string().parse(node.payload.campaignId),
  );
  const descendants = descendantsOf(rows, node.id);
  const depth = (await ancestry(services.store, node.id)).rows.length;
  const depths = await Promise.all(
    descendants.map(async (row) => (await ancestry(services.store, row.id)).rows.length - depth),
  );
  const link = await linkView(services, node);
  const receipts = await relatedRecords(services.store, "receipt", "nodeId", node.id);
  return linkStats.parse({
    nodeId: node.id,
    visitsEstimate: link.visitsEstimate,
    visitsBySource: [],
    estimate: true,
    directChildren: rows.filter((row) => row.payload.parentId === node.id).length,
    descendants: descendants.length,
    maxDepthBelow: Math.max(0, ...depths),
    sales: counts(receipts),
    earned: link.earned,
  });
};
export const resolutionView = async (services: Services, node: StoredRecord) => {
  const link = await ensureLink(services, node);
  const campaign = await services.store.require(
    "campaign",
    z.string().parse(node.payload.campaignId),
  );
  const card = await campaignCard(services.store, campaign);
  const path = await ancestry(services.store, node.id);
  const reward = simulatePolicy(
    BigInt(card.price),
    commissionPolicy.strip().parse(card.policy),
    path.rows.length,
  );
  const split = path.rows.slice(0, card.policy.maxRewardedAncestors).map((row, depth) => ({
    recipient: z.string().parse(row.payload.creator),
    amount: reward.amounts[depth]?.toString() ?? "0",
    depth,
    effectiveWeightBps: reward.weightsBps[depth] ?? 0,
  }));
  const entries = await pathView(services.store, node.id, split);
  const cursor = await services.store.get("indexer", "cursor");
  return referralResolution.parse({
    status: link.payload.retired ? "retired" : "ok",
    slug: link.payload.code,
    chainId: services.chain.chainId,
    campaignId: campaign.id,
    nodeId: node.id,
    parentNodeId: node.payload.parentId,
    owner: await actorView(services.store, z.string().parse(node.payload.creator)),
    eligiblePath: entries.nodes.slice(0, card.policy.maxRewardedAncestors),
    depth: path.rows.length,
    indexingStatus: !cursor
      ? "syncing"
      : Date.now() - Date.parse(z.string().parse(cursor.payload.indexedAt)) > 120000
        ? "behind"
        : cursor.payload.status === "syncing"
          ? "syncing"
          : "live",
  });
};
