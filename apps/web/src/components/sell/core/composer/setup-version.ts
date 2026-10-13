import { computeReward, type ClientOutput } from "@spoke/protocol";
import { termsFromPolicy } from "../studio/policy";
import type { ComposerToken } from "./derive";
import { msToLocal } from "./derive-rules";
import { blankFields, isStepKey, versionSteps, type ComposerFields, type StepKey } from "./fields";
import { productLite } from "./setup-create";
import type { VersionTarget } from "./use-composer";
import type { Draft } from "./use-draft-save";

type Campaign = ClientOutput<"campaigns.get">;
type Policies = ClientOutput<"campaigns.policy">;

const noticeMs = 24 * 3_600_000;
const slotMs = 15 * 60_000;

export const earliestEffective = (now: number) => now + noticeMs;

export const defaultEffective = (now: number) =>
  msToLocal(Math.ceil((earliestEffective(now) + slotMs) / slotMs) * slotMs);

export type VersionBlock = "ended" | "notLive" | "scheduled" | "other" | null;

export const versionBlock = (
  campaign: Campaign,
  policies: Policies,
  merchantAddress: string,
): VersionBlock => {
  if (campaign.merchant.address.toLowerCase() !== merchantAddress.toLowerCase()) return "other";
  if (campaign.state === "ENDED" || campaign.state === "EXPIRED") return "ended";
  if (campaign.state !== "FUNDED_ACTIVE" && campaign.state !== "PAUSED") return "notLive";
  return policies.scheduled ? "scheduled" : null;
};

export const versionToken = (campaign: Campaign): ComposerToken => ({
  address: campaign.token.address,
  symbol: campaign.token.symbol,
  decimals: campaign.token.decimals,
});

export const versionTarget = (campaign: Campaign, policies: Policies): VersionTarget => ({
  campaignId: campaign.campaignId,
  name: campaign.product.title,
  version: policies.current.version,
  current: policies.current,
  endsAt: Number(policies.current.expiry) * 1000,
  product: productLite(campaign.product),
  scheduled: policies.scheduled
    ? { version: policies.scheduled.version, effectiveAt: policies.scheduled.effectiveAt }
    : null,
});

export const versionFields = (
  target: VersionTarget,
  token: ComposerToken,
  draft: Draft | null,
  now: number,
): ComposerFields => {
  const policy = draft?.policy ?? target.current;
  const price = target.product.priceMinor;
  return {
    ...blankFields(5),
    terms: termsFromPolicy(policy, token, computeReward(price, policy.commissionBps, price)),
    effectiveAt: draft?.effectiveAt
      ? msToLocal(Date.parse(draft.effectiveAt))
      : defaultEffective(now),
  };
};

export const versionStep = (param: string | null): StepKey =>
  isStepKey(param) && versionSteps.some((step) => step === param) ? param : "rewards";
