import {
  BatteryEmptyIcon,
  FileSyncIcon,
  Link01Icon,
  Loading03Icon,
  PauseCircleIcon,
  StopCircleIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { required } from "../required";
import type { ExplainedChip } from "../types";

type ReferralLandingCase = {
  readonly line: string;
  readonly action?: string;
  readonly actionLine?: string;
};

export const linkStateCopy = {
  creating: {
    label: "Creating",
    icon: Loading03Icon,
    tone: "sky",
    explainer: "Recording your link onchain.",
  },
  active: {
    label: "Active",
    icon: Link01Icon,
    tone: "lime",
    explainer: "Purchases through this link record its path.",
  },
  paused: {
    label: "Paused",
    icon: PauseCircleIcon,
    tone: "amber",
    explainer:
      "The link still opens, but purchases are paused. Earnings from past sales still settle and can be claimed.",
  },
  exhausted: {
    label: "Out of budget",
    icon: BatteryEmptyIcon,
    tone: "pink",
    explainer:
      "The reward budget is used up. Purchases through your link are refused until the merchant adds budget. Earnings from past sales still settle.",
  },
  closed: {
    label: "Closed",
    icon: StopCircleIcon,
    tone: "faint",
    explainer:
      "The campaign is closed. The link shows its page but can’t be used to buy. Earnings from past sales still settle.",
  },
  termsChanging: {
    label: "Terms changing",
    icon: FileSyncIcon,
    tone: "amber",
    explainer: "New terms apply from {effectiveAt}. Sales before then keep today’s terms.",
  },
  hidden: {
    label: "Hidden",
    icon: ViewOffIcon,
    tone: "pink",
    demoOnly: true,
    explainer: "The campaign was removed from public pages. Earnings from past sales still settle.",
  },
} as const satisfies Record<string, ExplainedChip & { readonly demoOnly?: true }>;

export type LinkStateKey = keyof typeof linkStateCopy;

export const linkRoleLabels = {
  root: "Started a branch",
  child: "Shared from {parentHandle}",
  level: "Level {n}",
  nearest: "nearest to the buyer",
  you: "You",
} as const;

const directPurchaseLine = "Nobody earns a commission on this purchase.";

export const referralLandingCopy = {
  ownLink: {
    line: "This is your link. Share it; buying through your own path isn’t allowed.",
    action: "Buy directly",
    actionLine: directPurchaseLine,
  },
  ownLinkOnPath: {
    line: required.selfReferral,
    action: "Buy directly",
    actionLine: directPurchaseLine,
  },
  exhausted: {
    line: required.budgetDepleted,
    action: "Buy without rewards",
    actionLine: directPurchaseLine,
  },
  alreadyHasLink: {
    line: "You already have a link for this campaign.",
    action: "Open my link",
  },
  merchant: {
    line: "This is a link to your own campaign. Merchants can’t create links in their own campaigns.",
  },
} as const satisfies Record<string, ReferralLandingCase>;

export const joinEligibilityLines = {
  ok: "You can create a link for this campaign.",
  already_joined: "You already have a link for this campaign.",
  is_merchant: "This is your campaign. Merchants don’t create links for their own campaigns.",
  invitation_required: "This campaign is invitation only. Ask the merchant for an invitation.",
  paused: "The merchant paused this campaign. New links open again when it resumes.",
  ended: "This campaign has ended. It doesn’t accept new links.",
  capacity_reached: "This campaign has reached its limit of links.",
  invalid_parent: "The link you came from can’t take new links under it.",
  not_deployed: "Spoke’s contracts aren’t deployed on this network yet.",
} as const;

export type JoinEligibility = keyof typeof joinEligibilityLines;
