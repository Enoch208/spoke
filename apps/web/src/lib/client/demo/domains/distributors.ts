import type { ClientOutput } from "@spoke/protocol";
import { DAY, iso } from "../../../../demo/world/ids";
import type { DemoPerson } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { page, personByAddress, sum } from "../views/basics";
import { campaignOf } from "../views/catalog";
import { merchantsOwnedBy, requireMerchant } from "../views/merchant-org";
import { cardOf, recordOf } from "../views/reputation";
import {
  addBucket,
  allocationState,
  bucketsWire,
  countsOf,
  emptyBuckets,
} from "../views/settlement";

type PartnerRow = ClientOutput<"partners.get">["partner"];

const listed = (world: DemoWorld) =>
  world.people.filter(
    (person) =>
      person.isDistributor &&
      person.visibility !== "private" &&
      recordOf(world, person).settled.length > 0,
  );

const partnerNodes = (
  world: DemoWorld,
  merchantId: string,
  person: DemoPerson,
  campaignId?: string,
) =>
  world.nodes.filter(
    (node) =>
      campaignOf(world, node.campaignId)?.merchantId === merchantId &&
      (campaignId === undefined || node.campaignId === campaignId) &&
      person.addresses.some((address) => address.toLowerCase() === node.owner.toLowerCase()),
  );

const partnerRow = (
  world: DemoWorld,
  merchantId: string,
  person: DemoPerson,
  now: number,
  campaignId?: string,
): PartnerRow => {
  const nodes = partnerNodes(world, merchantId, person, campaignId);
  const ids = new Set(nodes.map((node) => node.id));
  const shares = world.sales.flatMap((sale) =>
    sale.allocations
      .filter((allocation) => ids.has(allocation.nodeId))
      .map((allocation) => ({ sale, allocation })),
  );
  const buckets = emptyBuckets();
  for (const share of shares) addBucket(buckets, share.sale, share.allocation, now);
  const settled = shares.filter((share) => share.sale.status === "FINALIZED");
  const lastSettled = Math.max(0, ...settled.map((share) => share.sale.finalizedAt ?? 0));
  return {
    ...cardOf(world, person, now, merchantId, true),
    linkCount: nodes.length,
    directSales: settled.filter((share) => share.allocation.level === 1).length,
    networkSales: settled.filter((share) => share.allocation.level > 1).length,
    settledValue: sum(settled.map((share) => share.sale.price)).toString(),
    rewards: bucketsWire(buckets),
    firstLinkAt: iso(Math.min(...nodes.map((node) => node.createdAt))),
    lastSettledAt: lastSettled ? iso(lastSettled) : null,
  };
};

const partnersOf = (world: DemoWorld, merchantId: string, campaignId?: string) =>
  world.people.filter((person) => partnerNodes(world, merchantId, person, campaignId).length > 0);

const statusOf = (row: PartnerRow, now: number) => {
  if (row.lastSettledAt === null) return "new";
  return now - Date.parse(row.lastSettledAt) > 30 * DAY ? "quiet" : "active";
};

const weeklySeries = (world: DemoWorld, merchantId: string, now: number) =>
  Array.from({ length: 12 }, (_, week) => {
    const end = now - (11 - week) * 7 * DAY;
    const start = end - 7 * DAY;
    const sales = world.sales.filter(
      (sale) =>
        campaignOf(world, sale.campaignId)?.merchantId === merchantId &&
        sale.nodeId !== null &&
        sale.purchasedAt >= start &&
        sale.purchasedAt < end,
    );
    return {
      at: iso(start),
      sales: countsOf(sales),
      value: sum(
        sales.filter((sale) => sale.status === "FINALIZED").map((sale) => sale.price),
      ).toString(),
      rewards: sum(
        sales.flatMap((sale) => sale.allocations.map((allocation) => allocation.amount)),
      ).toString(),
      links: world.nodes.filter(
        (node) =>
          campaignOf(world, node.campaignId)?.merchantId === merchantId &&
          node.createdAt >= start &&
          node.createdAt < end,
      ).length,
    };
  });

export const distributorsReads = {
  "distributors.search": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchantId = merchantsOwnedBy(world, runtime.personaId())[0]?.id ?? null;
    const cards = listed(world)
      .map((person) => ({ person, card: cardOf(world, person, now, merchantId) }))
      .filter(({ person, card }) =>
        [
          !input.categories?.length ||
            input.categories.some((category) => person.categories.includes(category)),
          input.minSettledSales === undefined ||
            (card.settledConversions ?? 0) >= input.minSettledSales,
          input.merchantDiversity === undefined ||
            (card.merchantCount ?? 0) >= input.merchantDiversity,
          input.recency === undefined ||
            (card.lastSettledAt !== null &&
              now - Date.parse(card.lastSettledAt) <= input.recency * DAY),
        ].every(Boolean),
      )
      .map(({ card }) => card);
    const sort = input.sort ?? "balanced";
    const score = (card: (typeof cards)[number]) =>
      sort === "diversity"
        ? (card.merchantCount ?? 0)
        : sort === "recent" || sort === "new"
          ? Date.parse(card.lastSettledAt ?? "1970-01-01T00:00:00.000Z")
          : (card.settledConversions ?? 0) + (card.merchantCount ?? 0) * 3;
    const ranked = cards
      .filter((card) => card.slot === "ranked")
      .sort((a, b) => score(b) - score(a));
    return { ...page(ranked, input), newDistributors: cards.filter((card) => card.slot === "new") };
  },
  "distributors.get": (input, runtime) => {
    const person = found(personByAddress(runtime.world, input.address), "Distributor");
    const merchantId = merchantsOwnedBy(runtime.world, runtime.personaId())[0]?.id ?? null;
    return cardOf(runtime.world, person, runtime.now(), merchantId, true);
  },
  "distributors.recommendations": (_input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = requireMerchant(world, runtime.personaId());
    return listed(world)
      .filter((person) => partnerNodes(world, merchant.id, person).length === 0)
      .map((person) => ({ person, record: recordOf(world, person) }))
      .sort((a, b) => b.record.settled.length - a.record.settled.length)
      .slice(0, 4)
      .map(({ person, record }) => ({
        ...cardOf(world, person, now, merchant.id),
        reasons: [
          `${String(record.settled.length)} settled sales across ${String(record.merchants.length)} merchants`,
          `Shares ${person.categories.join(" and ")}`,
        ],
      }));
  },
} satisfies PartialHandlers<"distributors">;

export const distributorsWrites = {} satisfies PartialHandlers<"distributors">;

export const partnersReads = {
  "partners.list": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = requireMerchant(world, runtime.personaId());
    const q = input.q?.trim().toLowerCase();
    const rows = partnersOf(world, merchant.id, input.campaignId)
      .map((person) => partnerRow(world, merchant.id, person, now, input.campaignId))
      .filter((row) => input.status === undefined || statusOf(row, now) === input.status)
      .filter(
        (row) =>
          !q ||
          [row.handle, row.displayName, row.address].some((text) =>
            text?.toLowerCase().includes(q),
          ),
      )
      .sort((a, b) =>
        input.sort === "recent"
          ? (b.lastSettledAt ?? "").localeCompare(a.lastSettledAt ?? "")
          : b.directSales + b.networkSales - (a.directSales + a.networkSales),
      );
    const merchantSales = world.sales.filter(
      (sale) =>
        campaignOf(world, sale.campaignId)?.merchantId === merchant.id && sale.nodeId !== null,
    );
    return {
      ...page(rows, input),
      summary: {
        partners: rows.length,
        sales: countsOf(merchantSales),
        value: sum(
          merchantSales.filter((sale) => sale.status === "FINALIZED").map((sale) => sale.price),
        ).toString(),
        series: weeklySeries(world, merchant.id, now),
      },
    };
  },
  "partners.get": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const merchant = requireMerchant(world, runtime.personaId());
    const person = found(personByAddress(world, input.address), "Partner");
    const nodes = partnerNodes(world, merchant.id, person);
    if (!nodes.length) return fail("NOT_FOUND", "That address isn't a partner of this business.");
    const ids = new Set(nodes.map((node) => node.id));
    const shares = world.sales.flatMap((sale) =>
      sale.allocations
        .filter((allocation) => ids.has(allocation.nodeId))
        .map((allocation) => ({ sale, allocation })),
    );
    const buckets = emptyBuckets();
    for (const share of shares) addBucket(buckets, share.sale, share.allocation, now);
    return {
      partner: partnerRow(world, merchant.id, person, now),
      nodes: nodes.map((node) => ({
        nodeId: node.id,
        parentNodeId: node.parentId ?? "0",
        childCount: world.nodes.filter((child) => child.parentId === node.id).length,
      })),
      sales: shares.map((share) => ({
        saleId: share.sale.id,
        level: share.allocation.level,
        amount: share.allocation.amount.toString(),
        state: allocationState(share.sale, share.allocation),
      })),
      rewards: bucketsWire(buckets),
    };
  },
} satisfies PartialHandlers<"partners">;

export const partnersWrites = {} satisfies PartialHandlers<"partners">;
