import type { CommissionPolicy } from "@spoke/protocol";
import type { Address } from "viem";
import { DAY, HOUR, demoId, iso } from "./ids";
import { policyAt } from "./sale-math";
import type { DemoCore, DemoId } from "./types";
import type { Invitation } from "./world";

type Status = Invitation["status"];

interface Row {
  key: string;
  to: DemoId;
  campaign: number;
  status: Status;
  sentAgo: number;
  expiresIn: number;
  withdrawnAgo?: number;
  message: string;
}

const rows: readonly Row[] = [
  {
    key: "mara-pending",
    to: demoId("u", 1),
    campaign: 5,
    status: "pending",
    sentAgo: 2 * DAY,
    expiresIn: 5 * DAY,
    message:
      "We read your template posts. Mockline fits the people you write for, and this cohort is invitation-only.",
  },
  {
    key: "mara-accepted",
    to: demoId("u", 1),
    campaign: 2,
    status: "accepted",
    sentAgo: 69 * DAY + 12 * HOUR,
    expiresIn: -55 * DAY,
    message:
      "Your design roundups are a great match for the brand starter kit. Would you share it?",
  },
  {
    key: "mara-expired",
    to: demoId("u", 1),
    campaign: 8,
    status: "expired",
    sentAgo: 40 * DAY,
    expiresIn: -26 * DAY,
    message: "Our monthly template library could suit your newsletter readers.",
  },
  {
    key: "mara-withdrawn",
    to: demoId("u", 1),
    campaign: 7,
    status: "withdrawn",
    sentAgo: 36 * HOUR,
    expiresIn: 12 * DAY,
    withdrawnAgo: DAY,
    message: "We'd love you to share our auto layout course once it opens.",
  },
  {
    key: "northbeam-pending",
    to: demoId("u", 33),
    campaign: 2,
    status: "pending",
    sentAgo: 5 * DAY,
    expiresIn: 9 * DAY,
    message:
      "Your design threads keep coming up with our customers. The brand kit pays three levels.",
  },
  {
    key: "northbeam-declined",
    to: demoId("u", 36),
    campaign: 3,
    status: "declined",
    sentAgo: 45 * DAY,
    expiresIn: -31 * DAY,
    message: "The Notion client portal fits your template audience. Want to try it?",
  },
  {
    key: "northbeam-withdrawn",
    to: demoId("u", 37),
    campaign: 2,
    status: "withdrawn",
    sentAgo: 30 * DAY,
    expiresIn: -16 * DAY,
    withdrawnAgo: 28 * DAY,
    message: "Sharing the brand starter kit with your course students could work well.",
  },
  {
    key: "northbeam-expired",
    to: demoId("u", 25),
    campaign: 3,
    status: "expired",
    sentAgo: 60 * DAY,
    expiresIn: -46 * DAY,
    message: "Developers keep asking us for a Notion client portal. Interested in sharing it?",
  },
];

const percent = (bps: number) => (bps % 100 === 0 ? String(bps / 100) : (bps / 100).toFixed(2));

const holdLabel = (seconds: number) => {
  if (seconds >= 86_400 && seconds % 86_400 === 0) return `${String(seconds / 86_400)}-day hold`;
  if (seconds >= 3600 && seconds % 3600 === 0) return `${String(seconds / 3600)}-hour hold`;
  return `${String(Math.max(1, Math.round(seconds / 60)))}-minute hold`;
};

export const termsSummary = (policy: CommissionPolicy): string =>
  [
    `${percent(policy.commissionBps)}% commission`,
    `${String(policy.weightsBps.length)} people paid (${policy.weightsBps.map(percent).join("/")})`,
    holdLabel(policy.holdSeconds),
  ].join(" · ");

const addressOf = (core: DemoCore, id: DemoId): Address | undefined =>
  core.people.find((person) => person.id === id)?.addresses[0];

export const seedInvitations = (core: DemoCore): Invitation[] =>
  rows.flatMap((row) => {
    const campaign = core.campaigns.find((candidate) => candidate.id === demoId("c", row.campaign));
    const distributor = addressOf(core, row.to);
    if (!campaign || !distributor) return [];
    const sentAt = core.anchor - row.sentAgo;
    const policy = policyAt(campaign, sentAt);
    return [
      {
        id: demoId("invitation", row.key),
        distributor,
        campaignId: campaign.id,
        merchantId: campaign.merchantId,
        message: row.message,
        terms: termsSummary(policy.policy),
        parentNodeId: null,
        policyHash: policy.hash,
        status: row.status,
        expiresAt: iso(core.anchor + row.expiresIn),
        withdrawnAt: row.withdrawnAgo === undefined ? null : iso(core.anchor - row.withdrawnAgo),
        createdAt: iso(sentAt),
      },
    ];
  });
