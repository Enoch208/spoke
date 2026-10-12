import { protocolLimits, type ClientOutput } from "@spoke/protocol";
import { zeroAddress } from "viem";
import { iso } from "../../../../demo/world/ids";
import { policyAt } from "../../../../demo/world/sale-math";
import type { DemoCampaign } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { found, type DemoInput, type PartialHandlers } from "../handler";
import { actor, demoTx, page, sum, type TxRef } from "../views/basics";
import {
  campaignCard,
  campaignOf,
  isMerchantOfCampaign,
  policyWire,
  productOf,
  productWire,
  scheduledVersion,
} from "../views/catalog";
import {
  countsOf,
  proceedsLedgerOf,
  proceedsLedgerWire,
  rewardLedgerOf,
  rewardLedgerWire,
  salesOf,
} from "../views/settlement";
import { campaignFilter, campaignSorter } from "./campaigns-filter";

type ActivityItem = ClientOutput<"campaigns.activity">["items"][number];

const nodesOf = (world: DemoWorld, campaignId: string) =>
  world.nodes.filter((node) => node.campaignId === campaignId);

const depthOf = (world: DemoWorld, nodeId: string | null): number => {
  let depth = 0;
  let current = nodeId === null ? undefined : world.nodes.find((node) => node.id === nodeId);
  while (current) {
    depth += 1;
    const parentId = current.parentId;
    current = parentId === null ? undefined : world.nodes.find((node) => node.id === parentId);
  }
  return depth;
};

const fundingTxs = (world: DemoWorld, campaign: DemoCampaign): TxRef[] =>
  world.fundings
    .filter((funding) => funding.campaignId === campaign.id && funding.kind === "deposited")
    .map((funding) => demoTx(`funding:${funding.id}`, funding.at));

const activityOf = (
  world: DemoWorld,
  campaign: DemoCampaign,
  merchantView: boolean,
): ActivityItem[] => {
  const none = actor(world, zeroAddress);
  const merchant = world.merchants.find((candidate) => candidate.id === campaign.merchantId);
  const owner = merchant ? actor(world, merchant.address, true) : none;
  const items: ActivityItem[] = [];
  for (const sale of salesOf(world, campaign.id)) {
    const node =
      sale.nodeId === null
        ? undefined
        : world.nodes.find((candidate) => candidate.id === sale.nodeId);
    const referrer = node ? actor(world, node.owner) : none;
    const amount = sale.price.toString();
    items.push({
      kind: "salePending",
      actor: referrer,
      amount,
      tx: demoTx(`sale:${sale.id}:purchase`, sale.purchasedAt),
      at: iso(sale.purchasedAt),
    });
    if (sale.finalizedAt !== null)
      items.push({
        kind: "saleFinalized",
        actor: referrer,
        amount,
        tx: demoTx(`sale:${sale.id}:finalize`, sale.finalizedAt),
        at: iso(sale.finalizedAt),
      });
    if (sale.refundedAt !== null)
      items.push({
        kind: "saleRefunded",
        actor: referrer,
        amount,
        tx: demoTx(`sale:${sale.id}:refund`, sale.refundedAt),
        at: iso(sale.refundedAt),
      });
  }
  for (const node of nodesOf(world, campaign.id))
    items.push({
      kind: "linkCreated",
      actor: actor(world, node.owner),
      amount: null,
      tx: demoTx(`node:${node.id}`, node.createdAt),
      at: iso(node.createdAt),
    });
  if (merchantView) {
    for (const funding of world.fundings.filter(
      (candidate) => candidate.campaignId === campaign.id && candidate.kind === "deposited",
    ))
      items.push({
        kind: "funded",
        actor: owner,
        amount: funding.amount.toString(),
        tx: demoTx(`funding:${funding.id}`, funding.at),
        at: iso(funding.at),
      });
    for (const claim of world.claims.filter((candidate) => candidate.campaignId === campaign.id))
      items.push({
        kind: "claimed",
        actor: owner,
        amount: claim.amount.toString(),
        tx: demoTx(`claim:${claim.id}`, claim.at),
        at: iso(claim.at),
      });
    for (const event of campaign.history)
      if (event.kind !== "activated")
        items.push({
          kind: event.kind,
          actor: owner,
          amount: null,
          tx: demoTx(`campaign:${campaign.id}:${event.kind}:${String(event.at)}`, event.at),
          at: iso(event.at),
        });
    for (const version of campaign.policies.filter((entry) => entry.version > 1))
      items.push({
        kind: "termsPublished",
        actor: owner,
        amount: null,
        tx: demoTx(`policy:${campaign.id}:${String(version.version)}`, version.publishedAt),
        at: iso(version.publishedAt),
      });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
};

const detail = (world: DemoWorld, campaign: DemoCampaign, now: number) => {
  const product = found(productOf(world, campaign.productId), "Product");
  const nodes = nodesOf(world, campaign.id);
  return {
    ...campaignCard(world, campaign, now),
    product: productWire(world, product),
    rewardLedger: rewardLedgerWire(rewardLedgerOf(world, campaign)),
    proceedsLedger: proceedsLedgerWire(proceedsLedgerOf(world, campaign)),
    startsAt: iso(campaign.history[0]?.at ?? campaign.createdAt),
    endsAt: iso(campaign.endsAt),
    counts: countsOf(salesOf(world, campaign.id)),
    nodeCount: nodes.length,
    inviteOnly: campaign.inviteOnly,
    moderation: {
      hidden: campaign.hidden,
      reason: campaign.hidden ? "Hidden from discovery by Spoke moderation." : null,
    },
    capacity: {
      nodes: protocolLimits.maxNodesPerCampaign,
      sales: protocolLimits.maxSalesPerCampaign,
    },
    trustMode: campaign.trustMode,
    creationTx: demoTx(`campaign:${campaign.id}:create`, campaign.createdAt),
    fundingTxs: fundingTxs(world, campaign),
    indexedAt: iso(now),
  };
};

const stats = (world: DemoWorld, campaign: DemoCampaign) => {
  const sales = salesOf(world, campaign.id);
  const nodes = nodesOf(world, campaign.id);
  const depths = new Map<number, number>();
  for (const sale of sales.filter((candidate) => candidate.nodeId !== null)) {
    const depth = depthOf(world, sale.nodeId);
    depths.set(depth, (depths.get(depth) ?? 0) + 1);
  }
  return {
    links: nodes.length,
    branches: nodes.filter((node) => node.parentId === null).length,
    deepestLevel: Math.max(0, ...nodes.map((node) => depthOf(world, node.id))),
    sales: countsOf(sales),
    settledValue: sum(
      sales.filter((sale) => sale.status === "FINALIZED").map((sale) => sale.price),
    ).toString(),
    reservedRewards: rewardLedgerOf(world, campaign).pendingReserved.toString(),
    depthMix: [...depths.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, count]) => ({ level, sales: count })),
  };
};

export const campaignPublicReads = {
  "campaigns.list": (input: DemoInput<"campaigns.list">, runtime) => {
    const now = runtime.now();
    const rows = runtime.world.campaigns
      .filter((campaign) => !campaign.hidden && campaignFilter(runtime, input)(campaign))
      .sort(campaignSorter(runtime.world, input.sort ?? "balanced", now))
      .map((campaign) => campaignCard(runtime.world, campaign, now));
    return { ...page(rows, input), total: rows.length };
  },
  "campaigns.get": (input, runtime) =>
    detail(
      runtime.world,
      found(campaignOf(runtime.world, input.campaignId), "Campaign"),
      runtime.now(),
    ),
  "campaigns.policy": (input, runtime) => {
    const campaign = found(campaignOf(runtime.world, input.campaignId), "Campaign");
    const now = runtime.now();
    const scheduled = scheduledVersion(campaign, now);
    return {
      current: policyWire(policyAt(campaign, now)),
      scheduled: scheduled ? policyWire(scheduled) : null,
      history: campaign.policies
        .filter((version) => version.effectiveAt <= now)
        .reverse()
        .map(policyWire),
    };
  },
  "campaigns.stats": (input, runtime) =>
    stats(runtime.world, found(campaignOf(runtime.world, input.campaignId), "Campaign")),
  "campaigns.activity": (input, runtime) => {
    const campaign = found(campaignOf(runtime.world, input.campaignId), "Campaign");
    const merchantView = isMerchantOfCampaign(runtime.world, runtime.personaId(), campaign);
    const kinds = input.kinds;
    const items = activityOf(runtime.world, campaign, merchantView).filter(
      (item) => !kinds?.length || kinds.includes(item.kind),
    );
    return page(items, input);
  },
} satisfies PartialHandlers<"campaigns">;
