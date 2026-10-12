import {
  ArrowTurnBackwardIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  TimeQuarterPassIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { EarningsBucket } from "@spoke/protocol";
import { required } from "../required";
import type { ExplainedChip } from "../types";

type BucketCopy = ExplainedChip & {
  readonly totalLabel: string;
  readonly demoOnly?: true;
};

type LedgerLabel = {
  readonly label: string;
  readonly explainer: string;
};

export const earningsBucketCopy = {
  atRisk: {
    totalLabel: "At risk",
    label: "At risk",
    icon: Clock01Icon,
    tone: "amber",
    explainer:
      "Reserved for you while the sale is in its hold. The merchant can refund it until {unlockAt}, which cancels this share.",
  },
  readyToFinalize: {
    totalLabel: "Ready to finalize",
    label: "Ready to finalize",
    icon: TimeQuarterPassIcon,
    tone: "sky",
    explainer:
      "The hold ended {unlockAt}, so this can’t be refunded now. Finalize the sale to make this share claimable. Anyone can finalize.",
  },
  claimable: {
    totalLabel: "Claimable",
    label: "Claimable",
    icon: Wallet01Icon,
    tone: "lime",
    explainer: required.finalized,
  },
  claimed: {
    totalLabel: "Claimed",
    label: "Claimed",
    icon: CheckmarkCircle02Icon,
    tone: "ink",
    explainer: required.claimed,
  },
  refunded: {
    totalLabel: "Refunded",
    label: "Refunded",
    icon: ArrowTurnBackwardIcon,
    tone: "pink",
    explainer: required.refunded,
  },
  reversed: {
    totalLabel: "Reversed",
    label: "Reversed",
    icon: CancelCircleIcon,
    tone: "pink",
    demoOnly: true,
    explainer:
      "The merchant-attested order was rejected, so its pending commissions were cancelled.",
  },
} as const satisfies Record<EarningsBucket, BucketCopy>;

export const earningsPendingGroup = {
  label: "Pending",
  buckets: ["atRisk", "readyToFinalize"],
} as const satisfies { label: string; buckets: readonly EarningsBucket[] };

export const earningsLines = {
  pageExplainer:
    "At risk earnings are cancelled if the merchant refunds the sale during its hold. Only claimable earnings can be claimed.",
  owed: "Owed {claimable}",
  claimed: "Claimed {claimed}",
} as const;

export const vaultRewardCopy = {
  netDeposited: {
    label: "Deposited",
    explainer: "Everything you’ve put into this campaign’s reward budget.",
  },
  available: {
    label: "Available",
    explainer:
      "Not yet promised to any sale. You can withdraw it while the campaign is paused, ended or expired.",
  },
  pendingReserved: {
    label: "Reserved for pending sales",
    explainer: "Held for sales still in their hold. Returns to available if a sale is refunded.",
  },
  vestedUnclaimed: {
    label: "Owed to distributors",
    explainer: "Settled commissions distributors haven’t claimed yet. Not withdrawable.",
  },
  rewardsClaimed: {
    label: "Claimed by distributors",
    explainer: "Commissions distributors have already claimed.",
  },
  surplusWithdrawn: {
    label: "Withdrawn by you",
    explainer: "Unused budget you’ve taken back.",
  },
} as const satisfies Record<string, LedgerLabel>;

export const vaultReconciliationLine =
  "Deposited equals available, reserved for pending sales, owed to distributors, claimed by distributors and withdrawn by you: {netDeposited} = {sum}.";

export const vaultProceedsCopy = {
  proceedsPending: {
    label: "Held until the hold ends",
    explainer: "Payments for sales still in their hold. Refundable to buyers until each hold ends.",
  },
  proceedsClaimable: {
    label: "Ready to claim",
    explainer: "Payments for settled sales, ready for you to claim.",
  },
  proceedsClaimed: {
    label: "Claimed",
    explainer: "Proceeds you’ve claimed.",
  },
  buyerRefunded: {
    label: "Refunded to buyers",
    explainer: "Payments returned by refunds.",
  },
} as const satisfies Record<string, LedgerLabel>;

export const vaultProceedsTotalLine = "Buyer payments received: {total}";
