import { allocatePolicyReward, computeReward } from "@spoke/protocol";
import type { Address, Hex } from "viem";
import type {
  DemoAllocation,
  DemoCampaign,
  DemoId,
  DemoNode,
  DemoPolicyVersion,
  DemoSale,
} from "./types";

export const policyAt = (campaign: DemoCampaign, at: number): DemoPolicyVersion => {
  const inForce = campaign.policies.filter((version) => version.effectiveAt <= at);
  const version = inForce.at(-1) ?? campaign.policies[0];
  if (!version) throw new RangeError(`Campaign ${campaign.id} has no policy.`);
  return version;
};

export const pathOf = (
  nodesById: ReadonlyMap<DemoId, DemoNode>,
  nodeId: DemoId | null,
): DemoNode[] => {
  const path: DemoNode[] = [];
  let current = nodeId === null ? undefined : nodesById.get(nodeId);
  while (current) {
    path.push(current);
    current = current.parentId === null ? undefined : nodesById.get(current.parentId);
  }
  return path;
};

export interface Quote {
  version: DemoPolicyVersion;
  reward: bigint;
  reserved: bigint;
  unallocated: bigint;
  allocations: DemoAllocation[];
}

export const quote = (
  campaign: DemoCampaign,
  price: bigint,
  path: readonly DemoNode[],
  at: number,
  direct: boolean,
): Quote => {
  const version = policyAt(campaign, at);
  const policy = version.policy;
  if (direct) return { version, reward: 0n, reserved: 0n, unallocated: 0n, allocations: [] };
  const reward = computeReward(price, policy.commissionBps, BigInt(policy.perSaleCap));
  const split = allocatePolicyReward(reward, policy, path.length);
  const allocations = split.amounts.map((amount, index): DemoAllocation => {
    const node = path[index];
    if (!node) throw new RangeError("Allocation without a path node.");
    return {
      nodeId: node.id,
      owner: node.owner,
      level: index + 1,
      weightBps: split.weightsBps[index] ?? 0,
      amount,
      claimId: null,
    };
  });
  return { version, reward, reserved: split.reserved, unallocated: split.unallocated, allocations };
};

export interface SaleDraft {
  campaign: DemoCampaign;
  nodeId: DemoId | null;
  buyer: Address;
  orderKey: Hex;
  price: bigint;
  purchasedAt: number;
  source: DemoSale["source"];
}

export const draftSale = (
  id: DemoId,
  draft: SaleDraft,
  nodesById: ReadonlyMap<DemoId, DemoNode>,
): DemoSale => {
  const path = pathOf(nodesById, draft.nodeId);
  const terms = quote(draft.campaign, draft.price, path, draft.purchasedAt, draft.nodeId === null);
  return {
    id,
    campaignId: draft.campaign.id,
    nodeId: draft.nodeId,
    buyer: draft.buyer,
    orderKey: draft.orderKey,
    policyVersion: terms.version.version,
    price: draft.price,
    reward: terms.reward,
    unallocated: terms.unallocated,
    allocations: terms.allocations,
    purchasedAt: draft.purchasedAt,
    unlockAt: draft.purchasedAt + terms.version.policy.holdSeconds * 1000,
    status: "PENDING",
    finalizedAt: null,
    refundedAt: null,
    proceedsClaimId: null,
    source: draft.source,
    reversed: false,
  };
};

export const reservedOf = (sale: DemoSale): bigint =>
  sale.allocations.reduce((sum, allocation) => sum + allocation.amount, 0n);
