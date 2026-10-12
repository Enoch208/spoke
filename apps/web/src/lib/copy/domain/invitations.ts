import {
  CancelCircleIcon,
  HourglassIcon,
  MailRemove01Icon,
  MailSend01Icon,
  StopCircleIcon,
  UserCheck01Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons";
import type { Chip, ExplainedChip } from "../types";

export const invitationStateCopy = {
  pending: {
    label: "Invited",
    icon: MailSend01Icon,
    tone: "amber",
    explainer: "{merchantName} invited you to {campaignName} on {date}.",
  },
  accepted: {
    label: "Accepted",
    icon: UserCheck01Icon,
    tone: "lime",
    explainer: "You can create a link for this campaign.",
  },
  declined: {
    label: "Declined",
    icon: CancelCircleIcon,
    tone: "faint",
    explainer: "You declined on {date}.",
  },
  expired: {
    label: "Expired",
    icon: HourglassIcon,
    tone: "faint",
    explainer: "This invitation expired on {date}.",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: MailRemove01Icon,
    tone: "faint",
    explainer: "The merchant withdrew this invitation.",
  },
} as const satisfies Record<
  "pending" | "accepted" | "declined" | "expired" | "withdrawn",
  ExplainedChip
>;

export const partnershipStateCopy = {
  proposed: { label: "Proposed", icon: MailSend01Icon, tone: "amber", demoOnly: true },
  active: { label: "Active", icon: UserCheck01Icon, tone: "lime", demoOnly: true },
  ended: { label: "Ended", icon: StopCircleIcon, tone: "faint", demoOnly: true },
} as const satisfies Record<string, Chip & { readonly demoOnly: true }>;

export const partnershipTermsLine = "Terms v{version}, {rate} commission, until {endDate}.";

export const teamMemberStateCopy = {
  invited: { label: "Invited", icon: MailSend01Icon, tone: "amber", demoOnly: true },
  active: { label: "Active", icon: UserCheck01Icon, tone: "lime", demoOnly: true },
  removed: { label: "Removed", icon: UserRemove01Icon, tone: "faint", demoOnly: true },
} as const satisfies Record<"invited" | "active" | "removed", Chip & { readonly demoOnly: true }>;

export const teamMemberRoleLine = "Role: {role}.";
