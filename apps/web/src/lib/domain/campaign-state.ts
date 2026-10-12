import { computeReward, type CampaignState } from "@spoke/protocol";
import { campaignStateCopy, campaignStateKeyByStatus, type CampaignStateKey } from "@/lib/copy";

export type CampaignStateInput = {
  readonly state: CampaignState;
  readonly price: string;
  readonly rewardAvailable: string;
  readonly policy: { readonly commissionBps: number; readonly perSaleCap: string };
  readonly moderation?: { readonly hidden: boolean } | undefined;
};

export const rewardPerSale = (campaign: CampaignStateInput) =>
  computeReward(
    BigInt(campaign.price),
    campaign.policy.commissionBps,
    BigInt(campaign.policy.perSaleCap),
  );

export const campaignStateKey = (campaign: CampaignStateInput): CampaignStateKey => {
  if (campaign.moderation?.hidden) return "hidden";
  if (campaign.state !== "FUNDED_ACTIVE") return campaignStateKeyByStatus[campaign.state];
  return BigInt(campaign.rewardAvailable) < rewardPerSale(campaign) ? "exhausted" : "live";
};

export const publicExplainer = (key: CampaignStateKey): string => {
  const copy = campaignStateCopy[key];
  if ("explainer" in copy) return copy.explainer;
  if ("explainerByLimit" in copy) return copy.explainerByLimit.sales;
  return copy.merchantExplainer;
};

const knownStatus = (state: string): state is Exclude<CampaignState, "FUNDED_ACTIVE"> =>
  state in campaignStateKeyByStatus;

export const merchantRowStateKey = (row: {
  readonly state: string;
  readonly rewardPerSale: string;
  readonly availableRewards: string;
}): CampaignStateKey => {
  if (knownStatus(row.state)) return campaignStateKeyByStatus[row.state];
  if (row.state === "FUNDED_ACTIVE")
    return BigInt(row.availableRewards) < BigInt(row.rewardPerSale) ? "exhausted" : "live";
  return "draft";
};
