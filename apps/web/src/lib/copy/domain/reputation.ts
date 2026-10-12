import {
  CheckmarkBadge01Icon,
  Clock01Icon,
  IncognitoIcon,
  RefreshIcon,
  Store01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { required } from "../required";
import type { ExplainedChip } from "../types";

export const reputationStateCopy = {
  noRecord: {
    label: "No settled sales yet",
    icon: Clock01Icon,
    tone: "faint",
    explainer: required.reputation,
  },
  settling: {
    label: "{count} settling",
    icon: Clock01Icon,
    tone: "amber",
    explainer:
      "{count} sales through your links are still in their hold. They count once they settle.",
  },
  hasRecord: {
    label: "{count} settled sales",
    icon: CheckmarkBadge01Icon,
    tone: "lime",
    explainer: "Settled sales through your links, after refunds.",
  },
  acrossMerchants: {
    label: "{count} merchants",
    icon: Store01Icon,
    tone: "lime",
    explainer: "Settled sales with {count} different merchants.",
  },
  syncing: {
    label: "As of block {block}",
    icon: RefreshIcon,
    tone: "sky",
    explainer: "Newer settled sales may not be counted yet.",
  },
} as const satisfies Record<string, ExplainedChip>;

export type ReputationStateKey = keyof typeof reputationStateCopy;

export const visibilityCopy = {
  private: {
    label: "Private",
    icon: ViewOffIcon,
    tone: "faint",
    isDefault: true,
    explainer:
      "Only you can see this record. Public graphs show you as “Someone”; merchants still see your address in their own campaign data. Choose Public or Pseudonymous so merchants can find you.",
  },
  pseudonymous: {
    label: "Pseudonymous",
    icon: IncognitoIcon,
    tone: "ink",
    explainer:
      "Your handle and chosen stats are public at usespoke.xyz/u/{handle}, without your name, bio, website, addresses or receipt links. Listed under your handle; search engines don’t index it.",
  },
  public: {
    label: "Public",
    icon: ViewIcon,
    tone: "ink",
    explainer:
      "Anyone can see your name, handle, chosen stats and receipt links at usespoke.xyz/u/{handle}. Listed in the distributor directory and discoverable by merchants.",
  },
} as const satisfies Record<
  "private" | "pseudonymous" | "public",
  ExplainedChip & { readonly isDefault?: true }
>;

export const reputationFieldLabels = {
  settledSales: "Settled sales",
  settledSalesValue: "Settled sales value",
  commissionSettled: "Commission settled",
  merchants: "Merchants",
  campaigns: "Campaigns",
  refundAdjustment: "Refund adjustment",
  categories: "Categories",
  activeSince: "Active since",
  lastActive: "Last active",
  methodology: "Methodology v{version}",
  asOfBlock: "As of block {block}",
} as const;
