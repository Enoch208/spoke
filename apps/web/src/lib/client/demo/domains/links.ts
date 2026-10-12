import type { ClientOutput } from "@spoke/protocol";
import { allocatePolicyReward } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import { pathOf, policyAt } from "../../../../demo/world/sale-math";
import type { DemoNode } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { fail, found, type PartialHandlers } from "../handler";
import { DEMO_CHAIN_ID, actor, addressesOf, demoTx, ownsAddress, page } from "../views/basics";
import {
  campaignCard,
  campaignOf,
  campaignState,
  isExhausted,
  isMerchantOfCampaign,
  policyWire,
  rewardPerSale,
} from "../views/catalog";
import {
  depthOfNode,
  descendantsOf,
  childrenOf,
  nodeIndex,
  nodeOf,
  prospectivePath,
} from "../views/graph";
import { addBucket, bucketsWire, countsOf, emptyBuckets } from "../views/settlement";

type LinkRow = ClientOutput<"links.mine">["items"][number];

export const linkUrl = (code: string) => `https://usespoke.xyz/r/${code}`;

const earnedOn = (world: DemoWorld, node: DemoNode, now: number) => {
  const buckets = emptyBuckets();
  for (const sale of world.sales)
    for (const allocation of sale.allocations)
      if (allocation.nodeId === node.id) addBucket(buckets, sale, allocation, now);
  return bucketsWire(buckets);
};

export const linkRow = (
  world: DemoWorld,
  node: DemoNode,
  viewerId: string,
  now: number,
): LinkRow => {
  const campaign = found(campaignOf(world, node.campaignId), "Campaign");
  const owner = ownsAddress(world, viewerId, node.owner);
  return {
    nodeId: node.id,
    code: node.code,
    url: linkUrl(node.code),
    campaign: campaignCard(world, campaign, now),
    parentNodeId: node.parentId ?? "0",
    levelFromMerchant: depthOfNode(nodeIndex(world), node),
    campaignStatus: campaignState(campaign, now),
    moderation: {
      state: node.moderation,
      reason: owner ? node.moderationReason : null,
      decidedAt: node.moderation === "visible" ? null : iso(node.createdAt + 86_400_000 * 3),
    },
    visitsEstimate: node.visits,
    conversions: world.sales.filter((sale) => sale.nodeId === node.id && sale.status !== "REFUNDED")
      .length,
    earned: owner ? earnedOn(world, node, now) : bucketsWire(emptyBuckets()),
    createdTxHash: demoTx(`node:${node.id}`, node.createdAt).hash,
    createdAt: iso(node.createdAt),
  };
};

const unknownResolution = (code: string): ClientOutput<"links.resolveCode"> => ({
  status: "unknown",
  slug: code,
  chainId: DEMO_CHAIN_ID,
  campaignId: "0",
  nodeId: "0",
  parentNodeId: "0",
  owner: { address: null, handle: null, displayName: null, visibility: "private" },
  eligiblePath: [],
  depth: 0,
  indexingStatus: "live",
});

const joinEligibility = (runtime: DemoRuntime, campaignId: string, parent: string | undefined) => {
  const world = runtime.world;
  const now = runtime.now();
  const campaign = found(campaignOf(world, campaignId), "Campaign");
  const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
  const existing = world.nodes.find(
    (node) => node.campaignId === campaign.id && mine.includes(node.owner.toLowerCase()),
  );
  const parentNode = parent === undefined || parent === "0" ? undefined : nodeOf(world, parent);
  const state = campaignState(campaign, now);
  const accepted = world.invitations.some(
    (invitation) =>
      invitation.campaignId === campaign.id &&
      invitation.status === "accepted" &&
      mine.includes(invitation.distributor.toLowerCase()),
  );
  if (existing) return { campaign, eligibility: "already_joined" as const, existing, parentNode };
  if (isMerchantOfCampaign(world, runtime.personaId(), campaign))
    return { campaign, eligibility: "is_merchant" as const, existing, parentNode };
  if (state === "CREATED_UNFUNDED")
    return { campaign, eligibility: "not_deployed" as const, existing, parentNode };
  if (state === "PAUSED") return { campaign, eligibility: "paused" as const, existing, parentNode };
  if (state === "ENDED" || state === "EXPIRED")
    return { campaign, eligibility: "ended" as const, existing, parentNode };
  if (parent !== undefined && parent !== "0" && parentNode?.campaignId !== campaign.id)
    return { campaign, eligibility: "invalid_parent" as const, existing, parentNode };
  if (campaign.inviteOnly && !accepted)
    return { campaign, eligibility: "invitation_required" as const, existing, parentNode };
  if (world.nodes.filter((node) => node.campaignId === campaign.id).length >= 256)
    return { campaign, eligibility: "capacity_reached" as const, existing, parentNode };
  return { campaign, eligibility: "ok" as const, existing, parentNode };
};

export const linksReads = {
  "links.mine": (input, runtime) => {
    const world = runtime.world;
    const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
    const rows = world.nodes
      .filter((node) => mine.includes(node.owner.toLowerCase()))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((node) => linkRow(world, node, runtime.personaId(), runtime.now()));
    return page(rows, input);
  },
  "links.get": (input, runtime) => {
    const node = found(nodeOf(runtime.world, input.nodeId), "Link");
    const row = linkRow(runtime.world, node, runtime.personaId(), runtime.now());
    return ownsAddress(runtime.world, runtime.personaId(), node.owner)
      ? row
      : { ...row, visitsEstimate: null, earned: null };
  },
  "links.resolveCode": (input, runtime) => {
    const world = runtime.world;
    const node = world.nodes.find((candidate) => candidate.code === input.code);
    if (!node) return unknownResolution(input.code);
    const campaign = found(campaignOf(world, node.campaignId), "Campaign");
    const index = nodeIndex(world);
    const path = pathOf(index, node.id);
    return {
      status: node.moderation === "hidden" ? "retired" : "ok",
      slug: node.code,
      chainId: DEMO_CHAIN_ID,
      campaignId: node.campaignId,
      nodeId: node.id,
      parentNodeId: node.parentId ?? "0",
      owner: actor(world, node.owner),
      eligiblePath: prospectivePath(world, campaign, path, runtime.personaId(), runtime.now()),
      depth: depthOfNode(index, node),
      indexingStatus: runtime.indexingStatus(),
    };
  },
  "links.previewJoin": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const { campaign, eligibility, existing, parentNode } = joinEligibility(
      runtime,
      input.campaignId,
      input.parent,
    );
    const policy = policyAt(campaign, now).policy;
    const ancestors = parentNode ? pathOf(nodeIndex(world), parentNode.id) : [];
    const reward = rewardPerSale(world, campaign, now);
    const examples = allocatePolicyReward(reward, policy, policy.maxRewardedAncestors).amounts;
    return {
      eligibility,
      nodeId: existing?.id ?? null,
      enforcedBy: campaign.inviteOnly ? "contract" : "spoke",
      budgetState:
        campaign.status === "unfunded"
          ? "unfunded"
          : isExhausted(world, campaign, now)
            ? "exhausted"
            : "funded",
      depth: ancestors.length + 1,
      ancestorsAbove: prospectivePath(world, campaign, ancestors, runtime.personaId(), now),
      policy: policyWire(policyAt(campaign, now)),
      exampleAmounts: examples.map((amount) => amount.toString()),
    };
  },
  "links.stats": (input, runtime) => {
    const world = runtime.world;
    const node = found(nodeOf(world, input.nodeId), "Link");
    if (!ownsAddress(world, runtime.personaId(), node.owner))
      return fail("NOT_AUTHORIZED", "Only the link's owner sees its stats.");
    const below = descendantsOf(world, node.id);
    const index = nodeIndex(world);
    const ownDepth = depthOfNode(index, node);
    const sales = world.sales.filter((sale) =>
      sale.allocations.some((allocation) => allocation.nodeId === node.id),
    );
    const shares = [46, 27, 17].map((percent) => Math.floor((node.visits * percent) / 100));
    const split = [...shares, node.visits - shares.reduce((total, count) => total + count, 0)];
    const sources = ["WhatsApp", "X", "Newsletter", "Direct"];
    return {
      nodeId: node.id,
      visitsEstimate: node.visits,
      visitsBySource: sources.map((source, position) => ({
        source,
        count: split[position] ?? 0,
        estimate: true as const,
      })),
      estimate: true as const,
      directChildren: childrenOf(world, node.id).length,
      descendants: below.length,
      maxDepthBelow: Math.max(0, ...below.map((child) => depthOfNode(index, child) - ownDepth)),
      sales: countsOf(sales),
      earned: earnedOn(world, node, runtime.now()),
    };
  },
} satisfies PartialHandlers<"links">;

export const linksWrites = {
  "links.recordOpen": (input, runtime) => {
    const node = runtime.world.nodes.find((candidate) => candidate.code === input.code);
    if (node && !ownsAddress(runtime.world, runtime.personaId(), node.owner)) node.visits += 1;
    return { ok: true as const };
  },
} satisfies PartialHandlers<"links">;
