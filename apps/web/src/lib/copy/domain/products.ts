import {
  Archive01Icon,
  Loading03Icon,
  Megaphone01Icon,
  PackageOpenIcon,
  PackageRemoveIcon,
  PencilEdit02Icon,
  Timer01Icon,
} from "@hugeicons/core-free-icons";
import type { ExplainedChip } from "../types";

export const productStateCopy = {
  draft: {
    label: "Draft",
    icon: PencilEdit02Icon,
    tone: "faint",
    explainer: "Not in any campaign yet.",
  },
  inCampaign: {
    label: "In {count} campaigns",
    icon: Megaphone01Icon,
    tone: "lime",
    explainer: "Its price is fixed per campaign. Terms for a sale never change after it happens.",
  },
  archived: {
    label: "Archived",
    icon: Archive01Icon,
    tone: "faint",
    explainer: "Hidden from new campaigns. Existing campaigns are unaffected.",
  },
} as const satisfies Record<string, ExplainedChip>;

export const accessStateCopy = {
  ready: {
    label: "Ready",
    icon: PackageOpenIcon,
    tone: "lime",
    explainer: "Your purchase is confirmed. Open or download it here.",
  },
  preparing: {
    label: "Preparing",
    icon: Loading03Icon,
    tone: "sky",
    explainer: "Your purchase is confirmed onchain. Getting your access ready.",
  },
  linkExpired: {
    label: "Link expired",
    icon: Timer01Icon,
    tone: "amber",
    explainer: "Download links last {duration}. Get a new one.",
    action: "Get a new link",
  },
  closed: {
    label: "Closed",
    icon: PackageRemoveIcon,
    tone: "pink",
    explainer: "Access ended because this purchase was refunded.",
  },
} as const satisfies Record<string, ExplainedChip & { readonly action?: string }>;

export type AccessStateKey = keyof typeof accessStateCopy;
