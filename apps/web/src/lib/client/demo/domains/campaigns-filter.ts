import type { CampaignState } from "@spoke/protocol";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { policyAt } from "../../../../demo/world/sale-math";
import type { DemoCampaign } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import type { DemoInput } from "../handler";
import { addressesOf } from "../views/basics";
import { campaignState, merchantOf, productOf } from "../views/catalog";
import { countsOf, rewardLedgerOf, salesOf } from "../views/settlement";

type Filters = DemoInput<"campaigns.list">;
type StatusFilter = NonNullable<Filters["status"]>;

const statusOf: Record<CampaignState, StatusFilter | "draft"> = {
  DRAFT_OFFCHAIN: "draft",
  CREATED_UNFUNDED: "not_live",
  FUNDED_ACTIVE: "active",
  PAUSED: "paused",
  ENDED: "ended",
  EXPIRED: "expired",
};

export const statusFilterOf = (campaign: DemoCampaign, now: number) =>
  statusOf[campaignState(campaign, now)];

const matchesText = (world: DemoWorld, campaign: DemoCampaign, q: string) => {
  const needle = q.trim().toLowerCase();
  const product = productOf(world, campaign.productId);
  const merchant = merchantOf(world, campaign.merchantId);
  return [product?.title, product?.summary, merchant?.name, campaign.id].some((text) =>
    text?.toLowerCase().includes(needle),
  );
};

export const campaignFilter = (runtime: DemoRuntime, input: Filters) => {
  const world = runtime.world;
  const now = runtime.now();
  const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
  return (campaign: DemoCampaign): boolean => {
    const policy = policyAt(campaign, now).policy;
    const checks = [
      statusFilterOf(campaign, now) === (input.status ?? "active"),
      input.q === undefined || matchesText(world, campaign, input.q),
      input.category === undefined ||
        productOf(world, campaign.productId)?.category === input.category,
      input.rateMin === undefined || policy.commissionBps >= input.rateMin,
      input.rateMax === undefined || policy.commissionBps <= input.rateMax,
      input.levels === undefined || policy.maxRewardedAncestors === input.levels,
      input.holdMax === undefined || policy.holdSeconds <= input.holdMax,
      input.budgetLeftMin === undefined ||
        rewardLedgerOf(world, campaign).available >= BigInt(input.budgetLeftMin),
      input.source === undefined || campaign.trustMode === input.source,
      input.invitationOnly === undefined || campaign.inviteOnly === input.invitationOnly,
      input.merchant === undefined ||
        merchantOf(world, campaign.merchantId)?.slug === input.merchant,
      !input.excludeJoined ||
        !world.nodes.some(
          (node) => node.campaignId === campaign.id && mine.includes(node.owner.toLowerCase()),
        ),
    ];
    return checks.every(Boolean);
  };
};

export const campaignSorter = (
  world: DemoWorld,
  sort: NonNullable<Filters["sort"]>,
  now: number,
) => {
  const key = (campaign: DemoCampaign): bigint => {
    const policy = policyAt(campaign, now).policy;
    const available = rewardLedgerOf(world, campaign).available;
    if (sort === "newest") return BigInt(campaign.createdAt);
    if (sort === "reward") return BigInt(policy.commissionBps);
    if (sort === "budget") return available;
    if (sort === "hold") return -BigInt(policy.holdSeconds);
    const settled = BigInt(countsOf(salesOf(world, campaign.id)).finalized);
    return settled * 10n ** 12n + (available < 10n ** 12n ? available : 10n ** 12n - 1n);
  };
  return (a: DemoCampaign, b: DemoCampaign) => {
    const difference = key(b) - key(a);
    if (difference !== 0n) return difference > 0n ? 1 : -1;
    return a.id.localeCompare(b.id);
  };
};
