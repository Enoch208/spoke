import type { ClientOutput } from "@spoke/protocol";
import { pathOf, policyAt, quote } from "../../../../demo/world/sale-math";
import type { DemoCampaign, DemoId, DemoNode, DemoSale } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { actor, ownsAddress, personByAddress } from "./basics";
import { campaignOf, priceOf } from "./catalog";
import { allocationState, countsOf } from "./settlement";

export type GraphNode = ClientOutput<"graph.ancestry">["nodes"][number];
export type PathEntry = ClientOutput<"graph.salePath">["nodes"][number];

export const nodeIndex = (world: DemoWorld): Map<DemoId, DemoNode> =>
  new Map(world.nodes.map((node) => [node.id, node]));

export const nodeOf = (world: DemoWorld, nodeId: string): DemoNode | undefined =>
  world.nodes.find((node) => node.id === nodeId);

export const depthOfNode = (index: ReadonlyMap<DemoId, DemoNode>, node: DemoNode): number =>
  pathOf(index, node.id).length;

export const childrenOf = (world: DemoWorld, nodeId: string): DemoNode[] =>
  world.nodes.filter((node) => node.parentId === nodeId);

export const descendantsOf = (world: DemoWorld, nodeId: string): DemoNode[] =>
  childrenOf(world, nodeId).flatMap((child) => [child, ...descendantsOf(world, child.id)]);

const masked = (world: DemoWorld, node: DemoNode, viewerId: string, reveal: boolean) =>
  node.moderation === "hidden" && !ownsAddress(world, viewerId, node.owner)
    ? actor(world, "0x0000000000000000000000000000000000000000")
    : actor(world, node.owner, reveal || ownsAddress(world, viewerId, node.owner));

export const graphNode = (
  world: DemoWorld,
  index: ReadonlyMap<DemoId, DemoNode>,
  node: DemoNode,
  viewerId: string,
  options: { reveal?: boolean; shownChildren?: number } = {},
): GraphNode => {
  const children = childrenOf(world, node.id).length;
  return {
    nodeId: node.id,
    campaignId: node.campaignId,
    parentNodeId: node.parentId ?? "0",
    owner: masked(world, node, viewerId, options.reveal ?? false),
    depth: depthOfNode(index, node),
    childCount: children,
    hiddenChildCount: Math.max(0, children - (options.shownChildren ?? children)),
    counts: countsOf(world.sales.filter((sale) => sale.nodeId === node.id)),
    moderationFlag: node.moderation !== "visible",
    activity: [],
  };
};

const samePerson = (world: DemoWorld, a: string, b: string) => {
  const person = personByAddress(world, a);
  return person !== undefined && person === personByAddress(world, b);
};

const repeated = (world: DemoWorld, path: readonly DemoNode[], index: number) =>
  path.slice(0, index).some((earlier) => {
    const node = path[index];
    return node !== undefined && samePerson(world, earlier.owner, node.owner);
  });

export const salePathEntries = (
  world: DemoWorld,
  sale: DemoSale,
  viewerId: string,
): PathEntry[] => {
  const index = nodeIndex(world);
  const campaign = campaignOf(world, sale.campaignId);
  const path = pathOf(index, sale.nodeId);
  const max = campaign
    ? (campaign.policies.find((version) => version.version === sale.policyVersion)?.policy
        .maxRewardedAncestors ?? 0)
    : 0;
  return path.map((node, position) => {
    const allocation = sale.allocations.find((candidate) => candidate.nodeId === node.id);
    const outside = position >= max;
    const unpaidReason =
      sale.status === "REFUNDED" ? (sale.reversed ? "REVERSED" : "REFUNDED") : null;
    return {
      nodeId: node.id,
      creator: masked(world, node, viewerId, false),
      depth: depthOfNode(index, node),
      paid: allocation !== undefined && sale.status !== "REFUNDED",
      repeatedWallet: repeated(world, path, position),
      outsideWindow: outside,
      effectiveWeightBps: allocation?.weightBps ?? 0,
      amount: (allocation?.amount ?? 0n).toString(),
      state: allocation ? allocationState(sale, allocation) : null,
      reasonIfUnpaid: outside ? "OUTSIDE_DEPTH" : allocation ? unpaidReason : "CAMPAIGN_EXCLUSION",
    };
  });
};

export const prospectivePath = (
  world: DemoWorld,
  campaign: DemoCampaign,
  path: readonly DemoNode[],
  viewerId: string,
  now: number,
): PathEntry[] => {
  const index = nodeIndex(world);
  const terms = quote(campaign, priceOf(world, campaign), path, now, false);
  const max = policyAt(campaign, now).policy.maxRewardedAncestors;
  return path.slice(0, 8).map((node, position) => {
    const allocation = terms.allocations[position];
    const outside = position >= max;
    return {
      nodeId: node.id,
      creator: masked(world, node, viewerId, false),
      depth: depthOfNode(index, node),
      paid: !outside && allocation !== undefined,
      repeatedWallet: repeated(world, path, position),
      outsideWindow: outside,
      effectiveWeightBps: outside ? 0 : (allocation?.weightBps ?? 0),
      amount: outside ? "0" : (allocation?.amount ?? 0n).toString(),
      state: null,
      reasonIfUnpaid: outside ? "OUTSIDE_DEPTH" : null,
    };
  });
};
