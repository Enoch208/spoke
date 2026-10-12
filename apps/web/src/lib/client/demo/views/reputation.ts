import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import type { DemoAllocation, DemoPerson, DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { blockAt, page, sum } from "./basics";
import { campaignOf } from "./catalog";
import { saleReceipt } from "./receipt";

export type ReputationProfile = ClientOutput<"reputation.mine">;
export type DistributorCard = ClientOutput<"distributors.get">;

export const METHODOLOGY_VERSION = "reputation-v1";

export interface DistributorRecord {
  settled: { sale: DemoSale; allocation: DemoAllocation }[];
  pending: number;
  refunded: { sale: DemoSale; allocation: DemoAllocation }[];
  merchants: string[];
  campaigns: string[];
}

export const recordOf = (world: DemoWorld, person: DemoPerson): DistributorRecord => {
  const mine = person.addresses.map((address) => address.toLowerCase());
  const shares = world.sales.flatMap((sale) =>
    sale.allocations
      .filter((allocation) => mine.includes(allocation.owner.toLowerCase()))
      .map((allocation) => ({ sale, allocation })),
  );
  const settled = shares.filter((share) => share.sale.status === "FINALIZED");
  const campaigns = [...new Set(settled.map((share) => share.sale.campaignId))];
  const merchants = [
    ...new Set(campaigns.map((id) => campaignOf(world, id)?.merchantId ?? "")),
  ].filter(Boolean);
  return {
    settled,
    pending: shares.filter((share) => share.sale.status === "PENDING").length,
    refunded: shares.filter((share) => share.sale.status === "REFUNDED"),
    merchants,
    campaigns,
  };
};

const median = (values: bigint[]): bigint | null => {
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return sorted[Math.floor(sorted.length / 2)] ?? null;
};

export const profileOf = (
  world: DemoWorld,
  person: DemoPerson,
  viewerId: string,
  now: number,
  cursor: { cursor?: string | undefined; limit?: number | undefined } = {},
): ReputationProfile => {
  const record = recordOf(world, person);
  const pseudonymous = person.visibility === "pseudonymous" && person.id !== viewerId;
  const times = record.settled.map((share) => share.sale.finalizedAt ?? share.sale.purchasedAt);
  const sales = [...new Set(record.settled.map((share) => share.sale))].sort(
    (a, b) => (b.finalizedAt ?? 0) - (a.finalizedAt ?? 0),
  );
  const evidence = page(sales, cursor);
  const grouped = (key: (sale: DemoSale) => string) => {
    const groups = new Map<string, DemoSale[]>();
    for (const share of record.settled)
      groups.set(key(share.sale), [...(groups.get(key(share.sale)) ?? []), share.sale]);
    return [...groups.entries()];
  };
  return {
    subject: pseudonymous ? null : (person.addresses[0] ?? null),
    handle: person.handle,
    displayName: pseudonymous ? null : person.displayName,
    methodologyVersion: METHODOLOGY_VERSION,
    evidencePeriod: {
      from: times.length ? iso(Math.min(...times)) : null,
      to: times.length ? iso(Math.max(...times)) : null,
    },
    settledConversions: record.settled.length,
    directConversions: record.settled.filter((share) => share.allocation.level === 1).length,
    networkConversions: record.settled.filter((share) => share.allocation.level > 1).length,
    netAttributedValue: sum(record.settled.map((share) => share.sale.price)).toString(),
    settledCommission: sum(record.settled.map((share) => share.allocation.amount)).toString(),
    median: median(record.settled.map((share) => share.allocation.amount))?.toString() ?? null,
    merchantCount: record.merchants.length,
    campaignCount: record.campaigns.length,
    refundAdjustment: sum(record.refunded.map((share) => share.allocation.amount)).toString(),
    lastIndexedBlock: blockAt(now),
    verificationTier: "unverified",
    evidence: {
      items: evidence.items.map((sale) => saleReceipt(world, sale, viewerId, now)),
      nextCursor: evidence.nextCursor,
    },
    perMerchant: grouped((sale) => campaignOf(world, sale.campaignId)?.merchantId ?? "").map(
      ([merchantId, list]) => ({
        merchantId,
        receiptIds: list.map((sale) => sale.id),
        settledConversions: list.length,
      }),
    ),
    perCampaign: grouped((sale) => sale.campaignId).map(([campaignId, list]) => ({
      campaignId,
      receiptIds: list.map((sale) => sale.id),
      settledConversions: list.length,
    })),
    pendingConversions: record.pending,
    visibility: person.visibility,
    acceptsInvitations: person.acceptsInvitations,
  };
};

export const cardOf = (
  world: DemoWorld,
  person: DemoPerson,
  now: number,
  partnerMerchantId: string | null,
  revealPrivate = false,
): DistributorCard => {
  const record = recordOf(world, person);
  const lastSettled = Math.max(0, ...record.settled.map((share) => share.sale.finalizedAt ?? 0));
  const isNew = now - person.joinedAt <= 30 * 86_400_000;
  const visibility = person.visibility === "public" ? "public" : "pseudonymous";
  const showName = person.visibility === "public";
  const address = person.addresses[0] ?? null;
  return {
    address: showName || revealPrivate ? address : null,
    handle: person.visibility === "private" ? null : person.handle,
    displayName: showName ? person.displayName : null,
    visibility,
    settledConversions:
      revealPrivate || world.accounts[person.id]?.profile.shownFields.includes("settledConversions")
        ? record.settled.length
        : null,
    merchantCount:
      revealPrivate || world.accounts[person.id]?.profile.shownFields.includes("merchantCount")
        ? record.merchants.length
        : null,
    categories: person.categories,
    lastSettledAt: lastSettled ? iso(lastSettled) : null,
    rankSignals: [
      { name: "settledConversions", value: record.settled.length },
      { name: "merchantDiversity", value: record.merchants.length },
      {
        name: "daysSinceLastSettled",
        value: lastSettled ? Math.floor((now - lastSettled) / 86_400_000) : -1,
      },
    ],
    slot: isNew ? "new" : "ranked",
    rankingVersion: "discovery-v1",
    methodologyVersion: METHODOLOGY_VERSION,
    isPartner:
      partnerMerchantId !== null &&
      world.nodes.some(
        (node) =>
          campaignOf(world, node.campaignId)?.merchantId === partnerMerchantId &&
          person.addresses.some(
            (candidate) => candidate.toLowerCase() === node.owner.toLowerCase(),
          ),
      ),
  };
};
