import { common } from "../common";
import { required } from "../required";
import type { TxActionCopy } from "./actions-shape";
import { txApprove } from "./approve";

const createCampaign = {
  name: "Launch campaign",
  label: "Launch {campaign}",
  steps: ["Create campaign", "Allow {budget}", "Deposit reward budget", "Go live"],
  idle: "Launch and fund {budget}",
  beforeConfirm: [
    "You’ll confirm {stepCount} steps. The terms below are recorded onchain. Terms for a sale never change after it happens. You can publish new terms for future sales with at least 24 hours’ notice.",
    required.depositFirst,
  ],
  stepHelpers: {
    create: "Records the product, price, commission and split onchain.",
    deposit: "Moves {budget} into this campaign’s reward budget.",
    goLive: "Opens the campaign for links and purchases now.",
  },
  progress: ["Creating campaign…", txApprove.progress, "Depositing budget…", "Going live…"],
  success: {
    title: "Campaign is live",
    body: "Campaign #{campaignId} is live on Monad Testnet with {budget} in its reward budget.",
    actions: ["View campaign", "Copy campaign link"],
  },
  toast: { text: "Campaign #{campaignId} is live", action: "Open campaign" },
  partial: {
    notFunded: {
      title: "Campaign created, not funded",
      body: required.notFunded,
      followUp: "Add a reward budget to finish launching.",
      actions: ["Add funds"],
    },
    notLiveYet: {
      title: "Funded, not live yet",
      body: "Your campaign is funded but not live yet. Go live to open it for links and purchases.",
      actions: ["Go live", "Finish later"],
    },
  },
  failures: [
    "VALIDATION_FAILED",
    "TOKEN_NOT_ALLOWED",
    "PAYMENT_ALLOWANCE_INSUFFICIENT",
    "INSUFFICIENT_SDUSD",
    "INSUFFICIENT_MON",
  ],
  validationFailures: ["InvalidCommission", "InvalidSchedule", "InvalidPrice", "ZeroAmount"],
  summary: [
    "Reward budget {deposit}",
    "Commission {pct}% of each sale, up to {cap}",
    "Rewarded levels {n} ({weights} nearest first)",
    "Settlement hold {hold}",
    required.depositFirst,
  ],
} as const satisfies TxActionCopy;

const fundCampaign = {
  name: "Add to reward budget",
  label: "Add to {campaign}’s budget",
  steps: ["Allow {amount}", "Add to budget"],
  idle: "Add {amount}",
  beforeConfirm: [required.depositFirst, "Available budget becomes {newAvailable}."],
  progress: [txApprove.progress, "Adding funds…"],
  success: {
    title: "Budget topped up",
    body: "{amount} added. Available budget is now {available}.",
    actions: ["Done"],
  },
  toast: { text: "{amount} added to the reward budget", action: "Show" },
  exhaustedNote: "Adding funds lets this campaign accept referred sales again.",
  failures: [
    "ZeroAmount",
    "UnknownCampaign",
    "CampaignIsEnded",
    "PAYMENT_ALLOWANCE_INSUFFICIENT",
    "INSUFFICIENT_SDUSD",
  ],
  summary: ["Adding {amount}", "Available after this {newAvailable}", required.depositFirst],
  alreadyDoneUnknown: {
    line: "We can’t tell whether this deposit went through. Check the campaign’s budget before trying again.",
    actions: ["Check budget", common.tryAgain],
  },
} as const satisfies TxActionCopy;

const withdrawUnused = {
  name: "Withdraw unused budget",
  label: "Withdraw unused budget",
  steps: ["Withdraw"],
  idle: "Withdraw {amount}",
  beforeConfirm: {
    line: "Returns all {amount} of unreserved reward budget to you. Reserved and owed commissions stay; they belong to the sales that earned them.",
    pausedCampaign: "If you resume, new referred sales are refused until you add budget.",
  },
  progress: "Withdrawing…",
  success: {
    title: "Budget withdrawn",
    body: "{amount} returned to your account. Available budget is now {available}.",
    actions: ["Done"],
  },
  toast: { text: "Withdrew {amount}" },
  failures: ["CampaignActive", "NOT_AUTHORIZED"],
  summary: [
    "Withdrawing {amount}",
    "Staying in the vault: Reserved for pending sales {pendingReserved} · Owed to distributors {owedToDistributors}",
  ],
} as const satisfies TxActionCopy;

const registerPolicyVersion = {
  name: "Publish new terms",
  label: "Publish new terms for {campaign}",
  steps: ["Publish new terms"],
  idle: "Publish new terms",
  beforeConfirm: [
    "New terms apply to sales from {effectiveAt}. Sales before then keep today’s terms. Terms for a sale never change after it happens.",
    "The reward token stays {token}.",
  ],
  progress: "Publishing terms…",
  success: {
    title: "New terms published",
    body: "Version {version} applies to sales from {effectiveAt}. Link owners and invited distributors are notified.",
    actions: ["View terms"],
  },
  toast: { text: "New terms for {campaignName} published" },
  fieldMessages: {
    effectiveAt: "New terms must take effect at least 24 hours after you publish them.",
    token: "The reward token can’t change.",
  },
  failures: ["VALIDATION_FAILED", "NOT_AUTHORIZED", "CampaignIsEnded"],
  summary: [
    "New terms apply from {effectiveAt}",
    "Commission {pct}% of each sale, up to {cap}",
    "Rewarded levels {n} ({weights} nearest first)",
    "Settlement hold {hold}",
    "Sales before {effectiveAt} keep today’s terms",
  ],
} as const satisfies TxActionCopy;

export const campaignTxActions = {
  createCampaign,
  fundCampaign,
  withdrawUnused,
  registerPolicyVersion,
} as const;
