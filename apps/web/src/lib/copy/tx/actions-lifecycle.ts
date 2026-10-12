import { required } from "../required";
import type { TxActionCopy } from "./actions-shape";

const pause = {
  name: "Pause new sales",
  label: "Pause {campaign}",
  steps: ["Pause campaign"],
  idle: "Pause new sales",
  beforeConfirm: [
    "Stops new purchases and new links. Refunds during the hold, finalizing and claims keep working.",
  ],
  progress: "Pausing…",
  success: { title: "Campaign paused", body: required.paused, actions: ["Done"] },
  toast: { text: "{campaignName} paused" },
  failures: ["NOT_AUTHORIZED", "CAMPAIGN_NOT_ACTIVE"],
  summary: ["New orders and links stop", "Pending sales, refunds and claims keep working"],
} as const satisfies TxActionCopy;

const resume = {
  name: "Resume sales",
  label: "Resume {campaign}",
  steps: ["Resume campaign"],
  idle: "Resume sales",
  beforeConfirm: ["Opens the campaign to new purchases and links again, with the same terms."],
  progress: "Resuming…",
  success: {
    title: "Campaign is live again",
    body: "New purchases and links are open.",
    actions: ["Done"],
  },
  toast: { text: "{campaignName} is live again" },
  failures: ["NOT_AUTHORIZED", "CAMPAIGN_NOT_ACTIVE"],
  summary: ["New orders and links start again"],
} as const satisfies TxActionCopy;

const end = {
  name: "End campaign",
  label: "End {campaign}",
  steps: ["End campaign"],
  idle: "End campaign",
  beforeConfirm: [
    "Stops new purchases and links for good; you can’t reopen it. Pending sales still settle or refund, and you can withdraw the unused budget afterwards.",
  ],
  confirmation: "I understand this can’t be undone",
  progress: "Ending…",
  success: {
    title: "Campaign ended",
    body: "No new purchases or links. {pendingCount} pending sales will still settle or refund.",
    actions: { availableAboveZero: ["Withdraw unused budget"], otherwise: ["Done"] },
  },
  toast: { text: "{campaignName} ended" },
  failures: ["NOT_AUTHORIZED", "CampaignIsEnded"],
  summary: ["This is permanent", "Pending sales still settle or refund; claims stay open"],
} as const satisfies TxActionCopy;

export const lifecycleTxActions = { pause, resume, end } as const;
