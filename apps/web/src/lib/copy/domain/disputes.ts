import {
  ArrowTurnBackwardIcon,
  CancelCircleIcon,
  CheckListIcon,
  Clock01Icon,
  Flag01Icon,
  JusticeScale01Icon,
  Message01Icon,
  StopCircleIcon,
} from "@hugeicons/core-free-icons";
import { required } from "../required";
import type { ExplainedChip } from "../types";

export const disputeHeaderLine =
  "Disputes are handled offchain. A refund is possible only until {unlockAt}.";

export const disputeStateCopy = {
  requested: {
    label: "Refund requested",
    icon: Message01Icon,
    tone: "amber",
    explainer: "Sent to {merchantName} on {date}. They can refund until {unlockAt}.",
  },
  waitingForMerchant: {
    label: "Waiting for merchant",
    icon: Clock01Icon,
    tone: "amber",
    explainer: "The merchant hasn’t answered yet.",
  },
  waitingForBuyer: {
    label: "Waiting for buyer",
    icon: Clock01Icon,
    tone: "amber",
    explainer: "The merchant asked the buyer for details.",
  },
  underReview: {
    label: "Under review",
    icon: JusticeScale01Icon,
    tone: "sky",
    explainer: "A Spoke operator is reviewing this case.",
  },
  refunded: {
    label: "Refunded",
    icon: ArrowTurnBackwardIcon,
    tone: "pink",
    explainer: required.refunded,
  },
  declined: {
    label: "Declined",
    icon: CancelCircleIcon,
    tone: "faint",
    explainer: "The merchant declined. Reason: {reason}.",
  },
  closedByHold: {
    label: "Closed",
    icon: StopCircleIcon,
    tone: "faint",
    explainer: "The hold ended before a refund, so the sale settled.",
  },
  appealOpen: {
    label: "Appeal open",
    icon: Flag01Icon,
    tone: "amber",
    explainer: "An appeal is open. Appeals can’t edit onchain history.",
  },
  appealDecided: {
    label: "Appeal decided",
    icon: CheckListIcon,
    tone: "ink",
    explainer: "Decision: {decision}. Recorded in the audit log.",
  },
} as const satisfies Record<string, ExplainedChip>;

export type DisputeStateKey = keyof typeof disputeStateCopy;
