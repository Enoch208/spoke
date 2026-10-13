import { required } from "@/lib/copy/required";

export type BlockedAction =
  "backToCampaign" | "explore" | "direct" | "purchase" | "otherCampaign" | "demo" | "retry";

export type BlockedCopy = {
  readonly title: string;
  readonly body: string;
  readonly second?: string;
  readonly actions: readonly BlockedAction[];
};

export const blockedCopy = {
  notDeployed: {
    title: "Checkout isn’t available yet",
    body: "Checkout isn’t available on this network yet.",
    actions: ["demo"],
  },
  notFound: {
    title: "Campaign not found",
    body: "We can’t find this campaign. It may have been removed or the link is wrong.",
    actions: ["explore"],
  },
  hidden: {
    title: "Taken down for review",
    body: "This campaign has been taken down from Spoke while it’s reviewed.",
    actions: ["explore"],
  },
  notNative: {
    title: "Sold in the merchant’s own store",
    body: "This product is sold through the merchant’s own store, not Spoke checkout.",
    actions: ["backToCampaign"],
  },
  subscription: {
    title: "Subscriptions are a demo preview",
    body: "Subscription checkout is a demo-only feature.",
    actions: ["backToCampaign"],
  },
  notFunded: {
    title: "Not open yet",
    body: required.notFunded,
    actions: ["backToCampaign"],
  },
  paused: {
    title: "Sales are paused",
    body: required.paused,
    second: "Nothing was charged.",
    actions: ["backToCampaign"],
  },
  ended: {
    title: "This campaign has ended",
    body: "This campaign has ended and no longer accepts orders.",
    second: "Nothing was charged.",
    actions: ["explore"],
  },
  expired: {
    title: "Sales window closed",
    body: "This campaign’s sales window closed on {endsAt}.",
    second: "Nothing was charged.",
    actions: ["explore"],
  },
  capacity: {
    title: "Not taking more orders",
    body: "This campaign isn’t taking more orders.",
    second: "Nothing was charged.",
    actions: ["backToCampaign"],
  },
  exhausted: {
    title: "Rewards are used up",
    body: required.budgetDepleted,
    actions: ["direct"],
  },
  zeroReward: {
    title: "Referred purchases are off",
    body: "This campaign can’t accept referred purchases right now.",
    actions: ["direct"],
  },
  selfReferral: {
    title: "You’re on this referral path",
    body: required.selfReferral,
    second: "You can still buy without a referral; nobody is rewarded for it.",
    actions: ["direct"],
  },
  merchant: {
    title: "This is your own campaign",
    body: "This is your own campaign. Merchants can’t buy from their own campaigns on Spoke, so test purchases never pay your distributors from your budget. Use a separate account to test.",
    actions: ["backToCampaign"],
  },
  alreadyBought: {
    title: "You already bought this",
    body: "You already bought this. Each account can buy a campaign’s product once.",
    actions: ["purchase"],
  },
  invalidReferral: {
    title: "This link doesn’t work here",
    body: "This referral link isn’t valid for this campaign.",
    actions: ["direct"],
  },
  otherCampaign: {
    title: "This link is for another campaign",
    body: "This link is for a different campaign: {product}.",
    actions: ["otherCampaign", "direct"],
  },
  splitMismatch: {
    title: "We couldn’t confirm the split",
    body: "We couldn’t confirm the reward split for this order. Nothing was charged. Try again in a moment.",
    actions: ["retry"],
  },
  other: {
    title: "This purchase can’t go through",
    body: "The purchase didn’t go through.",
    second: "Nothing was charged.",
    actions: ["backToCampaign"],
  },
} as const satisfies Record<string, BlockedCopy>;

export type BlockedKey = keyof typeof blockedCopy;

export const blockedActionLabels = {
  backToCampaign: "Back to campaign",
  explore: "Explore campaigns",
  openFiles: "Open your files",
  viewPurchase: "View your purchase",
  otherCampaign: "Go to that campaign",
  demo: "Try it in demo mode",
  retry: "Try again",
  direct: {
    exhausted: "Buy without rewards",
    selfReferral: "Buy directly",
    otherCampaign: "Buy this without a referral",
    fallback: "Buy without a referral",
  },
} as const;

export const directDialogCopy = {
  title: "Buy without a referral?",
  body: "{referrer} and the people before them won’t be rewarded for this purchase. Your price stays {price}.",
  reasons: {
    exhausted: "Nobody in the path is rewarded for this purchase.",
    zeroReward: "Nobody in the path is rewarded for this purchase.",
    selfReferral: "You’re on this link’s path, so it can’t pay a reward for your purchase.",
    invalidReferral: "This referral link isn’t valid for this campaign.",
    otherCampaign: "This link is for a different campaign.",
  },
  keep: "Keep the referral",
  confirm: "Buy without a referral",
  directLine: "Nobody earns a commission on this purchase.",
  priceStays: "Nobody earns a commission on this purchase. Your price stays {price}.",
} as const;
