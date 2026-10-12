import type { Address } from "viem";
import { DAY, HOUR } from "./ids";
import { availableOf, perSaleOf, productTitle, when, type NoticeSpec } from "./seed-accounts-copy";
import { campaignById, earningsNotices, newest } from "./seed-accounts-earnings";
import type { DemoCampaign, DemoCore, DemoNode } from "./types";

type StatusKind = DemoCampaign["history"][number]["kind"];

const statusCopy: Partial<Record<StatusKind, readonly [NoticeSpec["kind"], string, string]>> = {
  paused: [
    "campaign.paused",
    "paused",
    "New orders are paused. Existing balances and claims remain available.",
  ],
  resumed: ["campaign.resumed", "is live again", "New purchases through your link can earn again."],
  ended: ["campaign.ended", "closed", "No new purchases. Earnings from past sales still settle."],
};

const earnSpec = (
  kind: NoticeSpec["kind"],
  title: string,
  body: string,
  href: string,
  at: number,
  category: NoticeSpec["category"] = "earnings",
): NoticeSpec => ({ kind, category, workspace: "earn", title, body, href, at });

const whoMade = (core: DemoCore, node: DemoNode): string => {
  const person = core.people.find((candidate) => candidate.addresses.includes(node.owner));
  return person?.handle && person.visibility !== "private" ? `@${person.handle}` : "Someone";
};

const linkNotices = (core: DemoCore, address: Address): NoticeSpec[] => {
  const mine = core.nodes.filter((node) => node.owner === address);
  const titleOf = (node: DemoNode) => {
    const campaign = campaignById(core, node.campaignId);
    return campaign ? productTitle(core, campaign) : "a sample campaign";
  };
  const ready = newest(mine, (node) => node.createdAt, 1).map((node) =>
    earnSpec(
      "link.ready",
      "Your link is ready",
      `Your link for ${titleOf(node)} is ready to share.`,
      `/earn/links/${node.id}`,
      node.createdAt,
      "network",
    ),
  );
  const children = core.nodes.filter((node) => mine.some((parent) => parent.id === node.parentId));
  const branched = newest(children, (node) => node.createdAt, 1).map((node) =>
    earnSpec(
      "link.childCreated",
      "Your link branched",
      `${whoMade(core, node)} made a link from yours for ${titleOf(node)}.`,
      `/earn/network?campaign=${node.campaignId}&node=${node.id}`,
      node.createdAt,
      "network",
    ),
  );
  return [...ready, ...branched];
};

const lastSaleAt = (core: DemoCore, campaign: DemoCampaign): number =>
  Math.max(
    campaign.createdAt,
    ...core.sales.filter((sale) => sale.campaignId === campaign.id).map((sale) => sale.purchasedAt),
  );

const campaignNotices = (core: DemoCore, node: DemoNode): NoticeSpec[] => {
  const campaign = campaignById(core, node.campaignId);
  if (!campaign) return [];
  const title = productTitle(core, campaign);
  const href = `/earn/links/${node.id}`;
  const live = campaign.status === "active" && campaign.endsAt > core.anchor;
  const expired = campaign.status === "active" && !live;
  const history = [
    ...campaign.history,
    ...(expired ? [{ kind: "ended" as const, at: campaign.endsAt }] : []),
  ];
  const statuses = history.flatMap((event) => {
    const copy = statusCopy[event.kind];
    return copy ? [earnSpec(copy[0], `${title} ${copy[1]}`, copy[2], href, event.at)] : [];
  });
  const terms = campaign.policies
    .filter((version) => version.version > 1)
    .map((version) =>
      earnSpec(
        "campaign.termsChanging",
        `${title}'s terms are changing`,
        `New terms apply from ${when(version.effectiveAt)}. Sales before then keep today's terms.`,
        href,
        version.publishedAt,
      ),
    );
  const exhausted =
    live && availableOf(core, campaign) < perSaleOf(core, campaign, core.anchor)
      ? [
          earnSpec(
            "campaign.exhausted",
            "Rewards used up",
            `Purchases through your ${title} link are refused until the merchant adds budget. Earnings from past sales still settle.`,
            href,
            lastSaleAt(core, campaign),
          ),
        ]
      : [];
  return [...statuses, ...terms, ...exhausted];
};

export const linkOwnerNotices = (core: DemoCore, address: Address): NoticeSpec[] => [
  ...earningsNotices(core, address),
  ...linkNotices(core, address),
  ...core.nodes
    .filter((node) => node.owner === address)
    .flatMap((node) => campaignNotices(core, node)),
];

export const distributorInvites = (core: DemoCore): NoticeSpec[] => {
  const invite = core.campaigns.find((campaign) => campaign.inviteOnly);
  const lapsed = core.campaigns.find((campaign) => campaign.kind === "subscription");
  if (!invite || !lapsed) return [];
  const merchant =
    core.merchants.find((candidate) => candidate.id === invite.merchantId)?.name ??
    "A sample merchant";
  const rate = (invite.policies.at(-1)?.policy.commissionBps ?? 0) / 100;
  return [
    earnSpec(
      "invitation.received",
      `Invitation from ${merchant}`,
      `Create a link for ${productTitle(core, invite)} at ${String(rate)}% of the price.`,
      "/earn/invitations",
      core.anchor - 36 * HOUR,
      "invitations",
    ),
    earnSpec(
      "invitation.expired",
      "Invitation expired",
      `The invitation to share ${productTitle(core, lapsed)} expired.`,
      "/earn/invitations",
      core.anchor - 20 * DAY,
      "invitations",
    ),
  ];
};
