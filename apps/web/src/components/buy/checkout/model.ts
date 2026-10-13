import type { ClientOutput } from "@spoke/protocol";
import type { AnyTxRecord, TxStep } from "@/lib/tx/types";
import type { BlockedKey } from "../copy/blocked";

export type CheckoutPhase = "review" | "account" | "funds" | "pay" | "confirming" | "done";

export const stepperIndex = {
  review: 0,
  account: 1,
  funds: 2,
  pay: 3,
  confirming: 3,
  done: 4,
} as const satisfies Record<CheckoutPhase, number>;

export type RecordView =
  | { kind: "none" }
  | { kind: "active" }
  | { kind: "confirming"; unknown: boolean }
  | { kind: "stopped"; reason: "failed" | "rejected" | "replaced" | "interrupted" }
  | { kind: "done"; saleId: string | null; indexed: boolean };

const finishedPurchase = new Set(["confirmed", "indexed", "done"]);
const inFlightPurchase = new Set(["submitted", "included", "unknown"]);

export const purchaseStepOf = (record: AnyTxRecord): TxStep | null =>
  record.steps.find((step) => step.kind === "purchase") ?? null;

export const viewRecord = (record: AnyTxRecord | null): RecordView => {
  if (!record) return { kind: "none" };
  const purchase = purchaseStepOf(record);
  if (purchase && finishedPurchase.has(purchase.status))
    return {
      kind: "done",
      saleId: record.context.saleId ?? null,
      indexed: purchase.status !== "confirmed",
    };
  if (purchase?.hash && inFlightPurchase.has(purchase.status))
    return { kind: "confirming", unknown: purchase.status === "unknown" };
  const stopped = record.steps.find(
    (step) => step.status === "failed" || step.status === "rejected" || step.status === "replaced",
  );
  if (stopped?.status === "failed" || stopped?.status === "rejected")
    return { kind: "stopped", reason: stopped.status };
  if (stopped) return { kind: "stopped", reason: "replaced" };
  if (record.expired) return { kind: "none" };
  if (record.steps.some((step) => step.interrupted && step.status === "not_submitted"))
    return { kind: "stopped", reason: "interrupted" };
  return { kind: "active" };
};

export const selectPhase = (input: {
  started: boolean;
  signedIn: boolean;
  fundsReady: boolean;
  record: RecordView;
}): CheckoutPhase => {
  if (input.record.kind === "done") return "done";
  if (input.record.kind === "confirming") return "confirming";
  if (input.record.kind === "active" || input.record.kind === "stopped") return "pay";
  if (!input.started) return "review";
  if (!input.signedIn) return "account";
  if (!input.fundsReady) return "funds";
  return "pay";
};

export const lockedOrder = (record: RecordView) =>
  record.kind === "active" || record.kind === "confirming";

type Preview = ClientOutput<"checkout.preview">;
type Campaign = ClientOutput<"campaigns.get">;

const byContractError: Readonly<Record<string, BlockedKey>> = {
  SelfReferral: "selfReferral",
  InsufficientRewardEscrow: "exhausted",
  ZeroReward: "zeroReward",
  CampaignCapacityReached: "capacity",
  UnknownNode: "invalidReferral",
  InvalidReferralPath: "invalidReferral",
  InvalidParent: "invalidReferral",
  BuyerAlreadyPurchased: "alreadyBought",
  CampaignIsPaused: "paused",
  CampaignIsEnded: "ended",
  CampaignNotActive: "notFunded",
};

const byCode: Readonly<Record<string, BlockedKey>> = {
  SELF_REFERRAL: "selfReferral",
  INSUFFICIENT_REWARD_ESCROW: "exhausted",
  INVALID_REFERRAL_PATH: "invalidReferral",
  CAMPAIGN_PAUSED: "paused",
  CAMPAIGN_NOT_ACTIVE: "ended",
  CAMPAIGN_NOT_FUNDED: "notFunded",
  DUPLICATE_CHECKOUT: "alreadyBought",
};

export const blockedByError = (code: string, contractError: string | null): BlockedKey | null =>
  (contractError ? byContractError[contractError] : undefined) ?? byCode[code] ?? null;

export type ReferralCheck = "none" | "ok" | "invalid" | "otherCampaign";

const campaignBlock = (campaign: Campaign, now: number): BlockedKey | null => {
  if (campaign.moderation.hidden) return "hidden";
  if (campaign.trustMode !== "NATIVE_ONCHAIN") return "notNative";
  if (campaign.product.billingPeriod !== null) return "subscription";
  if (campaign.state === "PAUSED") return "paused";
  if (campaign.state === "ENDED") return "ended";
  if (campaign.state === "EXPIRED" || now >= Date.parse(campaign.endsAt)) return "expired";
  if (campaign.state !== "FUNDED_ACTIVE") return "notFunded";
  return null;
};

export const selectBlocked = (input: {
  campaign: Campaign;
  preview: Preview | undefined;
  referral: ReferralCheck;
  splitMatches: boolean;
  now: number;
}): BlockedKey | null => {
  const { campaign, preview } = input;
  if (preview?.buyer?.alreadyPurchasedSaleId) return "alreadyBought";
  if (preview?.buyer?.buyerIsMerchant) return "merchant";
  const fromCampaign = campaignBlock(campaign, input.now);
  if (fromCampaign) return fromCampaign;
  if (input.referral === "invalid") return "invalidReferral";
  if (input.referral === "otherCampaign") return "otherCampaign";
  if (preview?.blocking)
    return blockedByError(preview.blocking.code, preview.blocking.contractError) ?? "other";
  if (preview && !input.splitMatches) return "splitMismatch";
  return null;
};

export const directRecovery = (blocked: BlockedKey | null) =>
  blocked === "exhausted" ||
  blocked === "zeroReward" ||
  blocked === "selfReferral" ||
  blocked === "invalidReferral" ||
  blocked === "otherCampaign";
