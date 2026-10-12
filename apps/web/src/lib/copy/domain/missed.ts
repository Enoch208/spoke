import { required } from "../required";

type PathReasonCopy = {
  readonly kind: "sale" | "blockedCheckout";
  readonly label: string;
  readonly explainer: string;
  readonly otherExplainer: string;
  readonly demoOnly?: true;
};

type GraphReasonCopy = {
  readonly kind: "graphOnly";
  readonly explainer: string;
};

const reversed =
  "The merchant-attested order was rejected, so its pending commissions were cancelled.";
const invalidBuyer =
  "The buyer couldn’t buy under this campaign’s rules, for example the merchant’s own account or a second purchase by the same buyer.";
const campaignInactive = "The campaign was paused or had ended when the buyer tried to check out.";

export const missedReasonCopy = {
  OUTSIDE_DEPTH: {
    kind: "sale",
    label: "Outside eligible depth",
    explainer:
      "This campaign pays the {max} nearest people on the path. You were number {position}, so this sale paid the people closer to the buyer.",
    otherExplainer:
      "This campaign pays the {max} nearest people on the path. This link was number {position}, so this sale paid the people closer to the buyer.",
  },
  CAMPAIGN_EXCLUSION: {
    kind: "sale",
    label: "Excluded by campaign rules",
    explainer:
      "This campaign’s rules skip {ruleLabel} when choosing who gets paid, so your share went to the next eligible people.",
    otherExplainer:
      "This campaign’s rules skip {ruleLabel} when choosing who gets paid, so its share went to the next eligible people.",
  },
  REFUNDED: {
    kind: "sale",
    label: "Refunded sale",
    explainer: required.refunded,
    otherExplainer: required.refunded,
  },
  REVERSED: {
    kind: "sale",
    label: "Reversed",
    demoOnly: true,
    explainer: reversed,
    otherExplainer: reversed,
  },
  SELF_REFERRAL: {
    kind: "blockedCheckout",
    label: "Self-referral",
    explainer: required.selfReferral,
    otherExplainer: required.selfReferral,
  },
  INVALID_BUYER: {
    kind: "blockedCheckout",
    label: "Buyer not eligible",
    explainer: invalidBuyer,
    otherExplainer: invalidBuyer,
  },
  DEPLETED_POOL: {
    kind: "blockedCheckout",
    label: "Reward budget used up",
    explainer: required.budgetDepleted,
    otherExplainer: required.budgetDepleted,
  },
  CAMPAIGN_INACTIVE: {
    kind: "blockedCheckout",
    label: "Campaign not live",
    explainer: campaignInactive,
    otherExplainer: campaignInactive,
  },
  NOT_ON_PATH: {
    kind: "graphOnly",
    explainer:
      "This sale went through a different branch. Being in the same campaign doesn’t put you on its path.",
  },
} as const satisfies Record<string, PathReasonCopy | GraphReasonCopy>;

export type MissedReasonCode = keyof typeof missedReasonCopy;

export const missedSaleReasons = [
  "OUTSIDE_DEPTH",
  "CAMPAIGN_EXCLUSION",
  "REFUNDED",
  "REVERSED",
] as const satisfies readonly MissedReasonCode[];

export const blockedCheckoutReasons = [
  "SELF_REFERRAL",
  "INVALID_BUYER",
  "DEPLETED_POOL",
  "CAMPAIGN_INACTIVE",
] as const satisfies readonly MissedReasonCode[];

export const blockedCheckoutRecordLabel = "Offchain record · no sale was created onchain";
