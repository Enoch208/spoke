import {
  Alert01Icon,
  Alert02Icon,
  AlertCircleIcon,
  ArrowDataTransferHorizontalIcon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  DotIcon,
  Loading03Icon,
  MinusSignCircleIcon,
  SentIcon,
  TestTube01Icon,
} from "@hugeicons/core-free-icons";
import type { SubsystemHealth, TxState } from "@spoke/protocol";
import type { FeatureStatus } from "../../features";
import type { Mode } from "../../stores/mode";
import type { Chip } from "../types";

export const subsystemHealthCopy = {
  ok: { label: "Operational", icon: CheckmarkCircle02Icon, tone: "lime" },
  degraded: { label: "Degraded", icon: Alert01Icon, tone: "amber" },
  down: { label: "Down", icon: CancelCircleIcon, tone: "pink" },
  not_configured: { label: "Not set up", icon: MinusSignCircleIcon, tone: "faint" },
} as const satisfies Record<SubsystemHealth, Chip>;

const recorded = { label: "Recorded", icon: CheckmarkCircle02Icon, tone: "ink" } as const;

export const txRecordCopy = {
  wallet_confirmation: { label: "Waiting for you", icon: Clock01Icon, tone: "amber" },
  submitted: { label: "Sent", icon: SentIcon, tone: "sky" },
  included: { label: "Included", icon: Loading03Icon, tone: "sky" },
  confirmed: { label: "Confirmed", icon: CheckmarkCircle01Icon, tone: "sky" },
  indexed: recorded,
  done: recorded,
  rejected: { label: "Cancelled", icon: Cancel01Icon, tone: "faint" },
  failed: { label: "Failed", icon: Alert02Icon, tone: "pink" },
  unknown: { label: "Unconfirmed", icon: AlertCircleIcon, tone: "amber" },
  replaced: { label: "Replaced", icon: ArrowDataTransferHorizontalIcon, tone: "amber" },
} as const satisfies Record<Exclude<TxState, "not_submitted">, Chip>;

export const featureChipCopy = {
  live: { label: "Live", icon: DotIcon, tone: "lime" },
  "demo-only": { label: "Demo only", icon: TestTube01Icon, tone: "lilac" },
} as const satisfies Record<FeatureStatus, Chip>;

export const modeBadgeCopy = {
  live: { label: "Live testnet", icon: DotIcon, tone: "lime" },
  demo: { label: "Demo", icon: TestTube01Icon, tone: "lilac" },
} as const satisfies Record<Mode, Chip>;
