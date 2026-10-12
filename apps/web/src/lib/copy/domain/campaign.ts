import {
  Alert01Icon,
  BatteryEmptyIcon,
  BlockedIcon,
  DotIcon,
  FileSyncIcon,
  HourglassIcon,
  MailLock01Icon,
  PauseCircleIcon,
  PencilEdit02Icon,
  Rocket01Icon,
  StopCircleIcon,
  ViewOffIcon,
  WalletRemove01Icon,
} from "@hugeicons/core-free-icons";
import type { CampaignState } from "@spoke/protocol";
import { required } from "../required";
import type { Chip } from "../types";

type CampaignAudienceCopy =
  | {
      readonly publicVisible: true;
      readonly explainer: string;
      readonly merchantExplainer?: string;
    }
  | {
      readonly publicVisible: true;
      readonly explainerByLimit: Readonly<Record<"sales" | "links", string>>;
    }
  | {
      readonly publicVisible: false;
      readonly merchantExplainer: string;
      readonly publicGlobalState?: "GS-20";
    };

export type CampaignStateCopy = Chip & CampaignAudienceCopy & { readonly demoOnly?: true };

const endedPublic =
  "Closed by the merchant. No new purchases or links. Existing sales still settle and pay out.";
const expiredPublic =
  "Its end date passed on {endsAt}. No new purchases or links. Existing sales still settle and pay out.";

export const campaignStateCopy = {
  draft: {
    label: "Draft",
    icon: PencilEdit02Icon,
    tone: "faint",
    publicVisible: false,
    merchantExplainer: "Saved in Spoke only. Nothing is onchain yet.",
  },
  notFunded: {
    label: "Not funded",
    icon: WalletRemove01Icon,
    tone: "amber",
    publicVisible: true,
    explainer: required.notFunded,
    merchantExplainer: "Created onchain. Add a reward budget to open it for sales.",
  },
  notLiveYet: {
    label: "Not live yet",
    icon: Rocket01Icon,
    tone: "amber",
    publicVisible: true,
    explainer: "This campaign isn’t open yet.",
    merchantExplainer: "Funded but not live. Finish launching to open it for links and purchases.",
  },
  live: {
    label: "Live",
    icon: DotIcon,
    tone: "lime",
    publicVisible: true,
    explainer: "Open for purchases and new links.",
  },
  exhausted: {
    label: "Exhausted",
    icon: BatteryEmptyIcon,
    tone: "pink",
    publicVisible: true,
    explainer: `${required.budgetDepleted} You can still buy without rewards. Nobody earns a commission on that purchase.`,
    merchantExplainer:
      "New referred sales are refused until you add budget. Direct sales still go through. Pending sales still settle.",
  },
  paused: {
    label: "Paused",
    icon: PauseCircleIcon,
    tone: "amber",
    publicVisible: true,
    explainer: required.paused,
    merchantExplainer: `${required.paused} Resume any time. You can withdraw unused budget while it’s paused.`,
  },
  ended: {
    label: "Ended",
    icon: StopCircleIcon,
    tone: "faint",
    publicVisible: true,
    explainer: endedPublic,
    merchantExplainer:
      "Ended for good. You can withdraw the unused budget; amounts reserved for pending sales stay until those sales settle or are refunded.",
  },
  expired: {
    label: "Expired",
    icon: HourglassIcon,
    tone: "faint",
    publicVisible: true,
    explainer: expiredPublic,
    merchantExplainer: `${expiredPublic} You can withdraw the unused budget.`,
  },
  full: {
    label: "Full",
    icon: BlockedIcon,
    tone: "faint",
    publicVisible: true,
    explainerByLimit: {
      sales: "Reached its limit of {limit} sales. Existing sales still settle and pay out.",
      links: "Reached its limit of {limit} links. Existing sales still settle and pay out.",
    },
  },
  hidden: {
    label: "Hidden",
    icon: ViewOffIcon,
    tone: "pink",
    demoOnly: true,
    publicVisible: false,
    publicGlobalState: "GS-20",
    merchantExplainer:
      "Spoke moderators removed this campaign from public pages ({reasonCategory}). Existing sales still settle, refund and pay out.",
  },
} as const satisfies Record<string, CampaignStateCopy>;

export type CampaignStateKey = keyof typeof campaignStateCopy;

export const campaignModifierCopy = {
  invitationOnly: {
    label: "Invitation only",
    icon: MailLock01Icon,
    tone: "lilac",
    publicVisible: true,
    explainer: "Only invited distributors can create links.",
    merchantExplainer: "Only people you invite can create links.",
  },
  termsChanging: {
    label: "Terms changing",
    icon: FileSyncIcon,
    tone: "amber",
    publicVisible: true,
    explainer: "New terms apply from {effectiveAt}. Sales before then keep today’s terms.",
    merchantExplainer:
      "Your new terms apply from {effectiveAt}. Sales before then keep today’s terms.",
  },
  budgetLow: {
    label: "Budget low",
    icon: Alert01Icon,
    tone: "amber",
    publicVisible: false,
    merchantExplainer: "About {salesLeft} more referred sales before the reward budget runs out.",
  },
} as const satisfies Record<string, CampaignStateCopy>;

export type CampaignModifierKey = keyof typeof campaignModifierCopy;

export const campaignStatePrecedence = [
  "hidden",
  "ended",
  "expired",
  "paused",
  "notFunded",
  "notLiveYet",
  "exhausted",
  "full",
  "live",
] as const satisfies readonly CampaignStateKey[];

export const campaignStateKeyByStatus = {
  DRAFT_OFFCHAIN: "draft",
  CREATED_UNFUNDED: "notFunded",
  PAUSED: "paused",
  ENDED: "ended",
  EXPIRED: "expired",
} as const satisfies Record<Exclude<CampaignState, "FUNDED_ACTIVE">, CampaignStateKey>;

export const campaignStillWorksLine =
  "Refunds during the hold, finalizing and claims always work, even when a campaign is paused, ended or expired.";
