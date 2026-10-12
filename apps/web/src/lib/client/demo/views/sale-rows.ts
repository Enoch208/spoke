import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import type { DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import type { DemoInput } from "../handler";
import { DEMO_CHAIN_ID, actor } from "./basics";
import { campaignOf, merchantOf, productOf } from "./catalog";
import { nodeOf } from "./graph";
import { proceedsState, refundRequestOf } from "./receipt";

export type PurchaseRow = ClientOutput<"receipts.forBuyer">["items"][number];
export type SaleRow = ClientOutput<"receipts.forMerchant">["items"][number];
export type SaleFilters = DemoInput<"receipts.forMerchant">;

export const purchaseRow = (world: DemoWorld, sale: DemoSale): PurchaseRow => {
  const campaign = campaignOf(world, sale.campaignId);
  const product = campaign ? productOf(world, campaign.productId) : undefined;
  const merchant = campaign ? merchantOf(world, campaign.merchantId) : undefined;
  const node = sale.nodeId === null ? undefined : nodeOf(world, sale.nodeId);
  return {
    saleId: sale.id,
    chainId: DEMO_CHAIN_ID,
    campaignId: sale.campaignId,
    productTitle: product?.title ?? "",
    image: null,
    merchantName: merchant?.name ?? "",
    referrerHandle: node ? actor(world, node.owner).handle : null,
    amountPaid: sale.price.toString(),
    purchasedAt: iso(sale.purchasedAt),
    state: sale.status,
    unlockAt: iso(sale.unlockAt),
    refundedAt: sale.refundedAt === null ? null : iso(sale.refundedAt),
    refundRequestStatus: refundRequestOf(world, sale)?.status ?? null,
  };
};

export const campaignSaleRow = (world: DemoWorld, sale: DemoSale): Omit<SaleRow, "orderKey"> => {
  const campaign = campaignOf(world, sale.campaignId);
  const max =
    campaign?.policies.find((version) => version.version === sale.policyVersion)?.policy
      .maxRewardedAncestors ?? 1;
  return {
    ...purchaseRow(world, sale),
    reward: sale.reward.toString(),
    paidCount: sale.status === "REFUNDED" ? 0 : sale.allocations.length,
    maxPaid: max,
    trustMode: campaign?.trustMode ?? "NATIVE_ONCHAIN",
    proceedsState: proceedsState(sale),
  };
};

export const saleRow = (world: DemoWorld, sale: DemoSale): SaleRow => ({
  ...campaignSaleRow(world, sale),
  orderKey: sale.orderKey,
});

export const saleMatches = (
  world: DemoWorld,
  sale: DemoSale,
  filters: Partial<SaleFilters>,
): boolean => {
  const range = filters.range;
  const q = filters.q?.trim().toLowerCase();
  const node = sale.nodeId === null ? undefined : nodeOf(world, sale.nodeId);
  const handle = node ? (actor(world, node.owner, true).handle ?? "") : "";
  const checks = [
    filters.state === undefined || sale.status === filters.state,
    filters.campaignId === undefined || sale.campaignId === filters.campaignId,
    filters.campaignIds === undefined || filters.campaignIds.includes(sale.campaignId),
    filters.source === undefined ||
      (filters.source === "MERCHANT_ATTESTED") === (sale.source === "merchant_attested"),
    filters.unlockBefore === undefined || sale.unlockAt < Date.parse(filters.unlockBefore),
    range === undefined ||
      (sale.purchasedAt >= Date.parse(range.from) && sale.purchasedAt <= Date.parse(range.to)),
    !q ||
      sale.id.toLowerCase() === q ||
      sale.orderKey.toLowerCase() === q ||
      handle.toLowerCase().includes(q.replace(/^@/, "")),
  ];
  return checks.every(Boolean);
};

export const newestFirst = (a: DemoSale, b: DemoSale) => b.purchasedAt - a.purchasedAt;
