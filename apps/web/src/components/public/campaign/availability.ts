import type { CampaignDetail, CommissionPolicy } from "@spoke/protocol";
import { rewardAtPrice } from "../shared/policy-math";

export type AvailabilityKey =
  | "hidden"
  | "draft"
  | "notOpenYet"
  | "paused"
  | "ended"
  | "expired"
  | "salesLimit"
  | "exhausted"
  | "live";

export type ActionMode = "enabled" | "disabled" | "hidden";

type CampaignFacts = Pick<
  CampaignDetail,
  "state" | "endsAt" | "moderation" | "counts" | "capacity" | "price" | "rewardAvailable"
>;

export const availabilityKey = (
  campaign: CampaignFacts,
  policy: CommissionPolicy,
  now: number,
): AvailabilityKey => {
  if (campaign.moderation.hidden) return "hidden";
  if (campaign.state === "DRAFT_OFFCHAIN") return "draft";
  if (campaign.state === "CREATED_UNFUNDED") return "notOpenYet";
  if (campaign.state === "PAUSED") return "paused";
  if (campaign.state === "ENDED") return "ended";
  if (campaign.state === "EXPIRED" || now >= Date.parse(campaign.endsAt)) return "expired";
  const sales = campaign.counts.pending + campaign.counts.finalized + campaign.counts.refunded;
  if (sales >= campaign.capacity.sales) return "salesLimit";
  if (BigInt(campaign.rewardAvailable) < rewardAtPrice(BigInt(campaign.price), policy))
    return "exhausted";
  return "live";
};

export type ActionPlan = {
  buy: ActionMode;
  buyLabel: "buy" | "notOpenYet" | "purchasesPaused" | "rewardsUsedUp";
  buyWithoutRewards: boolean;
  create: ActionMode;
  createLabel: "createLink" | "notOpenYet" | "linksPaused";
};

const closed: ActionPlan = {
  buy: "hidden",
  buyLabel: "buy",
  buyWithoutRewards: false,
  create: "hidden",
  createLabel: "createLink",
};

export const actionPlan = (key: AvailabilityKey, hasReferral: boolean): ActionPlan => {
  if (key === "draft" || key === "notOpenYet")
    return {
      ...closed,
      buy: "disabled",
      buyLabel: "notOpenYet",
      create: "disabled",
      createLabel: "notOpenYet",
    };
  if (key === "paused")
    return {
      ...closed,
      buy: "disabled",
      buyLabel: "purchasesPaused",
      create: "disabled",
      createLabel: "linksPaused",
    };
  if (key === "exhausted")
    return {
      buy: hasReferral ? "disabled" : "enabled",
      buyLabel: hasReferral ? "rewardsUsedUp" : "buy",
      buyWithoutRewards: hasReferral,
      create: "enabled",
      createLabel: "createLink",
    };
  if (key === "live")
    return { ...closed, buy: "enabled", create: "enabled", createLabel: "createLink" };
  return closed;
};

export const acceptsActivity = (key: AvailabilityKey) =>
  key === "live" || key === "exhausted" || key === "paused";
