import { z } from "zod";
import { purchaseRow, saleRow } from "@spoke/protocol";
import type { StoredRecord } from "../db/store.js";
import type { ApiContext, Services } from "../types.js";
import { allRecords, pageValues, timestamp, stringListQuery } from "./read-utils.js";
import { jsonQuery } from "./read-utils.js";
import { campaignCard } from "./views.js";
import { actorView, receiptView } from "./evidence.js";
import { ApiProblem } from "../http/problem.js";

export const purchaseView = async (
  services: Services,
  row: StoredRecord,
  merchantFields = false,
) => {
  const campaign = await services.store.require(
    "campaign",
    z.string().parse(row.payload.campaignId),
  );
  const card = await campaignCard(services.store, campaign);
  const receipt = await receiptView(services, row, true);
  const version = merchantFields
    ? await services.store.get(
        "policy-version",
        `${campaign.id}_${String(row.payload.policyVersion)}`,
      )
    : null;
  const salePolicy =
    version?.payload ?? (card.policy.version === row.payload.policyVersion ? card.policy : null);
  if (merchantFields && !salePolicy)
    throw new ApiProblem(
      503,
      "INDEXER_LAGGING",
      "The purchase policy is still being indexed.",
      true,
    );
  const node =
    z.string().parse(row.payload.nodeId) === "0"
      ? null
      : await services.store.get("node", z.string().parse(row.payload.nodeId));
  const referrer = node
    ? await actorView(services.store, z.string().parse(node.payload.creator))
    : null;
  const base = {
    saleId: row.id,
    chainId: services.chain.chainId,
    campaignId: campaign.id,
    productTitle: card.product.title,
    image: card.product.media[0]?.url ?? null,
    merchantName: card.merchant.name,
    referrerHandle: referrer?.handle ?? null,
    amountPaid: receipt.price,
    purchasedAt: receipt.purchasedAt,
    state: receipt.state,
    unlockAt: receipt.unlockAt,
    refundedAt: receipt.refundTx?.at ?? null,
    refundRequestStatus: receipt.refundRequest?.status ?? null,
  };
  return merchantFields
    ? saleRow.parse({
        ...base,
        orderKey: receipt.orderKey,
        reward: receipt.rewardReserved,
        paidCount: receipt.allocations.length,
        maxPaid: z.object({ maxRewardedAncestors: z.number().int() }).parse(salePolicy)
          .maxRewardedAncestors,
        trustMode: receipt.trustMode,
        proceedsState: receipt.proceedsState,
      })
    : purchaseRow.parse(base);
};
export const filterSalesQuery = async (
  services: Services,
  raw: Record<string, string>,
  rows?: StoredRecord[],
) => {
  const query = z
    .object({
      q: z.string().max(200).optional(),
      state: z.enum(["PENDING", "FINALIZED", "REFUNDED"]).optional(),
      campaignId: z.string().optional(),
      campaignIds: z.string().optional(),
      since: z.iso.datetime().optional(),
      unlockBefore: z.iso.datetime().optional(),
      source: z.enum(["NATIVE_ONCHAIN", "MERCHANT_ATTESTED"]).optional(),
      provider: z.string().optional(),
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      range: z.string().optional(),
    })
    .parse(raw);
  const campaigns = query.campaignIds ? new Set(stringListQuery(query.campaignIds)) : null;
  const handle = query.q ? await services.store.identity("handle", query.q) : null;
  const account = handle ? await services.store.get("account", handle) : null;
  const visibleHandle =
    account &&
    z.object({ level: z.string() }).parse(account.payload.visibility).level !== "private";
  const matchingWallets = new Set(
    visibleHandle
      ? (await allRecords(services.store, "wallet", handle ?? "")).map((row) => row.id)
      : [],
  );
  if (visibleHandle) matchingWallets.add(z.string().parse(account.payload.address).toLowerCase());
  const range = query.range
    ? z.object({ from: z.iso.datetime(), to: z.iso.datetime() }).parse(jsonQuery(query.range))
    : null;
  return (rows ?? (await allRecords(services.store, "receipt")))
    .filter(
      (row) =>
        (!query.state ||
          ["NONE", "PENDING", "REFUNDED", "FINALIZED"][z.number().parse(row.payload.status)] ===
            query.state) &&
        (!query.campaignId || row.payload.campaignId === query.campaignId) &&
        (!campaigns || campaigns.has(z.string().parse(row.payload.campaignId))) &&
        (!query.since || timestamp(row.payload.purchasedAt) >= query.since) &&
        (!query.unlockBefore || timestamp(row.payload.unlockAt) <= query.unlockBefore) &&
        (!(query.from ?? range?.from) ||
          timestamp(row.payload.purchasedAt) >= z.string().parse(query.from ?? range?.from)) &&
        (!(query.to ?? range?.to) ||
          timestamp(row.payload.purchasedAt) <= z.string().parse(query.to ?? range?.to)) &&
        (!query.source || query.source === "NATIVE_ONCHAIN") &&
        !query.provider &&
        (!query.q ||
          row.id === query.q ||
          z.string().parse(row.payload.orderKey).toLowerCase().includes(query.q.toLowerCase()) ||
          matchingWallets.has(z.string().parse(row.payload.buyer).toLowerCase()) ||
          z
            .array(z.object({ recipient: z.string() }))
            .parse(row.payload.allocations)
            .some((allocation) => matchingWallets.has(allocation.recipient.toLowerCase()))),
    )
    .sort((a, b) => (BigInt(a.id) > BigInt(b.id) ? -1 : 1));
};
export const filteredSales = (services: Services, c: ApiContext, rows?: StoredRecord[]) =>
  filterSalesQuery(services, c.req.query(), rows);
export { pageValues };
