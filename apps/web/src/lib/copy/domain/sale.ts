import {
  ArrowTurnBackwardIcon,
  Blockchain01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Loading03Icon,
  Message01Icon,
  SignatureIcon,
  TimeQuarterPassIcon,
} from "@hugeicons/core-free-icons";
import type { SaleStatus } from "@spoke/protocol";
import { required } from "../required";
import type { ExplainedChip } from "../types";

type SaleChipCopy = ExplainedChip & {
  readonly merchantOnly?: true;
  readonly demoOnly?: true;
};

export const saleStateCopy = {
  confirming: {
    label: "Confirming",
    icon: Loading03Icon,
    tone: "sky",
    explainer: required.awaitingPurchase,
  },
  pending: {
    label: "Pending",
    icon: Clock01Icon,
    tone: "amber",
    explainer: `${required.pendingSale} The merchant can refund it until {unlockAt}.`,
  },
  readyToFinalize: {
    label: "Ready to finalize",
    icon: TimeQuarterPassIcon,
    tone: "sky",
    explainer:
      "The hold ended {unlockAt}. It can’t be refunded now. Anyone can finalize it to settle the sale.",
  },
  settled: {
    label: "Settled",
    icon: CheckmarkBadge01Icon,
    tone: "lime",
    explainer: required.finalized,
  },
  refunded: {
    label: "Refunded",
    icon: ArrowTurnBackwardIcon,
    tone: "pink",
    explainer: required.refunded,
  },
  proceedsClaimed: {
    label: "Proceeds claimed",
    icon: CheckmarkCircle02Icon,
    tone: "ink",
    merchantOnly: true,
    explainer: required.claimed,
  },
} as const satisfies Record<string, SaleChipCopy>;

export type SaleStateKey = keyof typeof saleStateCopy;

export const saleStateKeyByStatus = {
  PENDING: "pending",
  FINALIZED: "settled",
  REFUNDED: "refunded",
} as const satisfies Record<SaleStatus, SaleStateKey>;

export const saleFlagCopy = {
  refundRequested: {
    label: "Refund requested",
    icon: Message01Icon,
    tone: "amber",
    explainer:
      "The buyer asked for a refund. The merchant can refund until {unlockAt}; after that the sale can only settle.",
  },
} as const satisfies Record<string, SaleChipCopy>;

export const saleSourceCopy = {
  nativeOnchain: {
    label: "Onchain payment",
    icon: Blockchain01Icon,
    tone: "ink",
    explainer: "The buyer paid through the Spoke contract on Monad Testnet.",
  },
  merchantAttested: {
    label: "Merchant-attested",
    icon: SignatureIcon,
    tone: "lilac",
    demoOnly: true,
    explainer: required.merchantAttested,
  },
} as const satisfies Record<string, SaleChipCopy>;

export type SaleSourceKey = keyof typeof saleSourceCopy;

export const saleSourceKeyByTrustMode = {
  NATIVE_ONCHAIN: "nativeOnchain",
  MERCHANT_ATTESTED: "merchantAttested",
} as const satisfies Record<string, SaleSourceKey>;

export const saleHoldLines = {
  hold: required.pendingHold,
  countdown: "Hold ends in {countdown}",
} as const;
