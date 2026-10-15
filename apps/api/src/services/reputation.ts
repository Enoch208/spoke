import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { reputationProfile, publicReputationProfile, visibilityInput } from "@spoke/protocol";
import type { Services } from "../types.js";
import type { StoredRecord } from "../db/store.js";
import { events } from "../db/schema.js";
import { ApiProblem } from "../http/problem.js";
import { allRecords, indexedBlock, timestamp } from "./read-utils.js";
import { allocations, campaignProduct } from "./views.js";
import { receiptView } from "./evidence.js";
import { passportView } from "./partner-passport.js";

export const reputationFacts = async (
  services: Services,
  address: string,
  campaignIds?: Set<string>,
) => {
  const { store } = services;
  const owner = await store.identity("wallet", address.toLowerCase());
  const account = owner ? await store.get("account", owner) : undefined;
  const visibility = visibilityInput.parse(account?.payload.visibility ?? { level: "private" });
  const receipts = (await allRecords(store, "receipt")).filter(
    (row) =>
      (!campaignIds || campaignIds.has(z.string().parse(row.payload.campaignId))) &&
      allocations
        .parse(row.payload.allocations)
        .some((item) => item.recipient.toLowerCase() === address.toLowerCase()),
  );
  const settled = receipts.filter((row) => row.payload.status === 3);
  const pending = receipts.filter((row) => row.payload.status === 1);
  const refunded = receipts.filter((row) => row.payload.status === 2);
  const campaigns = await allRecords(store, "campaign");
  const involved = campaigns.filter((row) =>
    settled.some((receipt) => receipt.payload.campaignId === row.id),
  );
  const share = (row: StoredRecord) =>
    allocations
      .parse(row.payload.allocations)
      .find((item) => item.recipient.toLowerCase() === address.toLowerCase());
  const direct = settled.filter((row) => share(row)?.depth === 0).length;
  const values = settled
    .map((row) => BigInt(z.string().parse(row.payload.price)))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const middle = Math.floor(values.length / 2);
  const median = values.length
    ? ((values.length % 2
        ? values[middle]
        : ((values[middle - 1] ?? 0n) + (values[middle] ?? 0n)) / 2n) ?? null)
    : null;
  const finalized = await store.db
    .select()
    .from(events)
    .where(and(eq(events.chainId, services.chain.chainId), eq(events.name, "SaleFinalized")));
  const finalizedAt = new Map(finalized.map((event) => [event.payload.saleId, event.at.getTime()]));
  settled.sort((a, b) => (finalizedAt.get(b.id) ?? 0) - (finalizedAt.get(a.id) ?? 0));
  const times = settled
    .map((row) => {
      const event = finalized.find((event) => event.payload.saleId === row.id);
      if (!event)
        throw new ApiProblem(
          503,
          "INDEXER_LAGGING",
          "Settlement evidence is still being indexed.",
          true,
        );
      return event.at.toISOString();
    })
    .sort();
  const categories = (await Promise.all(involved.map((row) => campaignProduct(store, row)))).map(
    (product) => product.category,
  );
  const categorySales = await Promise.all(
    settled.map(
      async (row) =>
        (
          await campaignProduct(
            store,
            await store.require("campaign", z.string().parse(row.payload.campaignId)),
          )
        ).category,
    ),
  );
  const nodes = (await allRecords(store, "node", address.toLowerCase())).filter(
    (row) => !campaignIds || campaignIds.has(z.string().parse(row.payload.campaignId)),
  );
  const liveCampaigns = campaigns.filter(
    (campaign) =>
      nodes.some((node) => node.payload.campaignId === campaign.id) &&
      campaign.payload.active &&
      !campaign.payload.paused &&
      !campaign.payload.ended &&
      BigInt(z.string().parse(campaign.payload.endsAt)) * 1000n > BigInt(Date.now()),
  );
  const liveProducts = await Promise.all(
    liveCampaigns.map(async (campaign) => ({
      campaignId: campaign.id,
      category: (await campaignProduct(store, campaign)).category,
    })),
  );
  const linkedCategories = liveProducts.map((product) => product.category);
  const liveLinks = nodes.flatMap((node) => {
    const product = liveProducts.find((product) => product.campaignId === node.payload.campaignId);
    return product
      ? [{ createdAt: timestamp(node.payload.createdAt), category: product.category }]
      : [];
  });
  const firstLinkAt = nodes.map((node) => timestamp(node.payload.createdAt)).sort()[0] ?? null;
  return {
    linkedCategories,
    firstLinkAt,
    liveLinks,
    address,
    account,
    visibility,
    receipts,
    settled,
    pending,
    refunded,
    involved,
    direct,
    network: settled.length - direct,
    netAttributedValue: values.reduce((sum, value) => sum + value, 0n).toString(),
    settledCommission: settled
      .reduce((sum, row) => sum + BigInt(share(row)?.amount ?? "0"), 0n)
      .toString(),
    refundAdjustment: refunded
      .reduce((sum, row) => sum + BigInt(share(row)?.amount ?? "0"), 0n)
      .toString(),
    median: median?.toString() ?? null,
    merchantCount: new Set(involved.map((row) => row.owner)).size,
    campaignCount: involved.length,
    firstSettledAt: times[0] ?? null,
    lastSettledAt: times[times.length - 1] ?? null,
    categories: [...new Set(categories)],
    categorySales,
    nodes,
    finalized,
  };
};
export type ReputationFacts = Awaited<ReturnType<typeof reputationFacts>>;
export const reputationView = async (
  services: Services,
  address: string,
  privateFields = false,
) => {
  if (!privateFields) {
    const owner = await services.store.identity("wallet", address.toLowerCase());
    const account = owner ? await services.store.get("account", owner) : undefined;
    if (
      visibilityInput.parse(account?.payload.visibility ?? { level: "private" }).level === "private"
    )
      return { hidden: true as const };
  }
  const facts = await reputationFacts(services, address);
  const { account, visibility, settled } = facts;
  if (!privateFields && visibility.level === "private") return { hidden: true as const };
  const full =
    privateFields ||
    (visibility.level === "public" &&
      [
        "settledConversions",
        "netAttributedValue",
        "merchantCount",
        "campaignCount",
        "refundAdjustment",
      ].every((field) => visibility.fields.some((chosen) => chosen === field)));
  const base = reputationProfile.parse({
    passport: full ? await passportView(services, facts, privateFields) : null,
    subject: privateFields || visibility.level === "public" ? address : null,
    handle: account?.payload.handle ?? null,
    displayName:
      privateFields || visibility.level === "public"
        ? (account?.payload.displayName ?? null)
        : null,
    methodologyVersion: "settled-path-v1",
    evidencePeriod: { from: facts.firstSettledAt, to: facts.lastSettledAt },
    settledConversions: settled.length,
    directConversions: facts.direct,
    networkConversions: facts.network,
    netAttributedValue: facts.netAttributedValue,
    settledCommission: facts.settledCommission,
    median: facts.median,
    merchantCount: facts.merchantCount,
    campaignCount: facts.campaignCount,
    refundAdjustment: facts.refundAdjustment,
    lastIndexedBlock: await indexedBlock(services.store),
    verificationTier: "NATIVE_ONCHAIN",
    evidence: {
      items: full
        ? await Promise.all(settled.slice(0, 25).map((row) => receiptView(services, row)))
        : [],
      nextCursor: full && settled.length > 25 ? (settled[24]?.id ?? null) : null,
    },
    perMerchant: full
      ? [...new Set(facts.involved.map((row) => row.owner))].map((owner) => {
          const ids = new Set(
            facts.involved.filter((row) => row.owner === owner).map((row) => row.id),
          );
          const rows = settled.filter((row) => ids.has(z.string().parse(row.payload.campaignId)));
          return {
            merchantId: owner,
            receiptIds: rows.map((row) => row.id),
            settledConversions: rows.length,
          };
        })
      : [],
    perCampaign: full
      ? facts.involved.map((campaign) => {
          const rows = settled.filter((row) => row.payload.campaignId === campaign.id);
          return {
            campaignId: campaign.id,
            receiptIds: rows.map((row) => row.id),
            settledConversions: rows.length,
          };
        })
      : [],
    pendingConversions: facts.pending.length,
    visibility: visibility.level,
    acceptsInvitations: visibility.acceptsInvitations,
  });
  if (privateFields) return base;
  const selected = new Set(visibility.fields);
  const conversions = selected.has("settledConversions");
  return publicReputationProfile.parse({
    ...base,
    settledConversions: conversions ? base.settledConversions : null,
    directConversions: conversions ? base.directConversions : null,
    networkConversions: conversions ? base.networkConversions : null,
    pendingConversions: null,
    netAttributedValue: selected.has("netAttributedValue") ? base.netAttributedValue : null,
    settledCommission: null,
    median: selected.has("netAttributedValue") ? base.median : null,
    merchantCount: selected.has("merchantCount") ? base.merchantCount : null,
    campaignCount: selected.has("campaignCount") ? base.campaignCount : null,
    refundAdjustment: selected.has("refundAdjustment") ? base.refundAdjustment : null,
    evidencePeriod: conversions ? base.evidencePeriod : { from: null, to: null },
    visibleFields: visibility.fields,
    indexing: visibility.level === "pseudonymous" ? "noindex" : "index",
  });
};
