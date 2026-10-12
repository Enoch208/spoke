import type { Address } from "viem";
import { DAY, HOUR, MINUTE, demoId, sampleHash } from "./ids";
import { sampleBuyer } from "./people";
import type { Random } from "./random";
import { draftSale } from "./sale-math";
import { saleTargets, scriptedSales, type Outcome, type ScriptedSale } from "./sale-script";
import type { DemoCampaign, DemoId, DemoNode, DemoProduct, DemoSale } from "./types";

interface SalesInput {
  anchor: number;
  campaigns: readonly DemoCampaign[];
  products: readonly DemoProduct[];
  nodes: readonly DemoNode[];
  buyerPersona: Address;
  random: Random;
}

const windowOf = (campaign: DemoCampaign, anchor: number): readonly [number, number] => {
  const stop = campaign.history.find(
    (event) => event.kind === "paused" || event.kind === "ended",
  )?.at;
  const start = Math.max(campaign.createdAt + 2 * HOUR, anchor - 90 * DAY);
  return [start, Math.min(anchor - 10 * MINUTE, campaign.endsAt, stop ?? Number.POSITIVE_INFINITY)];
};

const settle = (sale: DemoSale, outcome: Outcome, anchor: number, random: Random): DemoSale => {
  const hold = sale.unlockAt - sale.purchasedAt;
  if (outcome === "refunded" || outcome === "reversed") {
    const refundedAt = Math.min(
      sale.purchasedAt + Math.floor(hold * (0.1 + random.next() * 0.6)),
      anchor - MINUTE,
    );
    return { ...sale, status: "REFUNDED", refundedAt, reversed: outcome === "reversed" };
  }
  if (outcome === "finalized") {
    const finalizedAt = Math.min(sale.unlockAt + random.int(10, 36 * 60) * MINUTE, anchor - MINUTE);
    return { ...sale, status: "FINALIZED", finalizedAt: Math.max(finalizedAt, sale.unlockAt) };
  }
  return sale;
};

const autoOutcome = (sale: DemoSale, anchor: number, random: Random): Outcome => {
  if (sale.unlockAt > anchor) return random.chance(0.12) ? "refunded" : "pending";
  if (random.chance(0.07)) return "refunded";
  return sale.unlockAt + 36 * HOUR < anchor || random.chance(0.6) ? "finalized" : "pending";
};

export const buildSales = ({
  anchor,
  campaigns,
  products,
  nodes,
  buyerPersona,
  random,
}: SalesInput): DemoSale[] => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const campaignByNumber = new Map(
    campaigns.map((campaign) => [Number(campaign.id.split("-").at(-1)), campaign]),
  );
  const buyersByCampaign = new Map<DemoId, Set<Address>>();
  let buyerCursor = 1;
  let orderCursor = 1;

  const freshBuyer = (campaignId: DemoId): Address => {
    const used = buyersByCampaign.get(campaignId) ?? new Set<Address>();
    buyersByCampaign.set(campaignId, used);
    let buyer = sampleBuyer(buyerCursor);
    while (used.has(buyer)) buyer = sampleBuyer(++buyerCursor);
    buyerCursor = (buyerCursor % 160) + 1;
    used.add(buyer);
    return buyer;
  };

  const make = (
    campaign: DemoCampaign,
    nodeId: DemoId | null,
    purchasedAt: number,
    buyer: Address,
    outcome: Outcome | null,
  ) => {
    const product = products.find((candidate) => candidate.id === campaign.productId);
    if (!product) throw new RangeError(`Campaign ${campaign.id} has no product.`);
    const draft = draftSale(
      demoId("s", `draft-${String(orderCursor)}`),
      {
        campaign,
        nodeId,
        buyer,
        orderKey: sampleHash(`order:${String(orderCursor++)}`),
        price: product.price,
        purchasedAt,
        source: campaign.trustMode === "MERCHANT_ATTESTED" ? "merchant_attested" : "native",
      },
      nodesById,
    );
    return settle(draft, outcome ?? autoOutcome(draft, anchor, random), anchor, random);
  };

  const scripted = scriptedSales.map((spec: ScriptedSale) => {
    const campaign = campaignByNumber.get(spec.campaign);
    if (!campaign) throw new RangeError(`No campaign ${String(spec.campaign)}.`);
    const nodeId = spec.node === null ? null : demoId("n", `${String(spec.campaign)}-${spec.node}`);
    if (nodeId !== null && !nodesById.has(nodeId)) throw new RangeError(`No node ${nodeId}.`);
    const buyer = spec.buyer === "persona" ? buyerPersona : freshBuyer(campaign.id);
    if (spec.buyer === "persona")
      buyersByCampaign.set(
        campaign.id,
        (buyersByCampaign.get(campaign.id) ?? new Set()).add(buyer),
      );
    return make(campaign, nodeId, anchor + spec.at, buyer, spec.outcome);
  });

  const filler = Object.entries(saleTargets).flatMap(([key, target]) => {
    const campaign = campaignByNumber.get(Number(key));
    if (!campaign) return [];
    const count = target - scripted.filter((sale) => sale.campaignId === campaign.id).length;
    const [start, end] = windowOf(campaign, anchor);
    const campaignNodes = nodes.filter((node) => node.campaignId === campaign.id);
    return Array.from({ length: Math.max(count, 0) }, () => {
      const purchasedAt = start + Math.floor(random.next() * (end - start));
      const open = campaignNodes.filter((node) => node.createdAt < purchasedAt);
      const nodeId = open.length && !random.chance(0.1) ? random.pick(open).id : null;
      return make(campaign, nodeId, purchasedAt, freshBuyer(campaign.id), null);
    });
  });

  return [...scripted, ...filler]
    .sort((a, b) => a.purchasedAt - b.purchasedAt)
    .map((sale, index) => ({ ...sale, id: demoId("s", index + 1) }));
};
