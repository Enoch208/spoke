import type { CommissionPolicy } from "@spoke/protocol";
import { DAY, iso } from "./ids";
import { mainAddress, personaMerchant, personOf } from "./seed-growth-plus-scope";
import type { DemoCampaign, DemoCore } from "./types";
import type { Community, CommunityMember, Partnership } from "./world";

const percent = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

export const termsLine = (
  policy: Pick<CommissionPolicy, "commissionBps" | "weightsBps">,
  tail: string,
) =>
  [
    percent(policy.commissionBps),
    `${String(policy.weightsBps.length)} levels`,
    policy.weightsBps.map((weight) => String(weight / 100)).join("/"),
    tail,
  ].join(" · ");

const RENEWING = "6 months, renews · 30 days' notice";
const AT_TERM = "3 months, ends at term · 14 days' notice";

const campaignWith = (core: DemoCore, merchantId: string, status: DemoCampaign["status"]) => {
  const campaign = core.campaigns.find(
    (candidate) => candidate.merchantId === merchantId && candidate.status === status,
  );
  if (!campaign) throw new RangeError(`The sample business needs a ${status} campaign.`);
  return campaign;
};

const versions = (campaign: DemoCampaign, tail: string) =>
  campaign.policies.map((version) => ({
    version: version.version,
    terms: termsLine(version.policy, tail),
    at: iso(version.publishedAt),
  }));

const noSales = { pending: 0, finalized: 0, refunded: 0 };

export const seedPartnerships = (core: DemoCore): Partnership[] => {
  const merchant = personaMerchant(core).id;
  const live = campaignWith(core, merchant, "active");
  const ended = campaignWith(core, merchant, "ended");
  const current = live.policies.at(-1)?.policy ?? live.policies[0]?.policy;
  if (!current) throw new RangeError(`${live.id} has no policy.`);
  const history = versions(live, RENEWING);
  const proposal = termsLine(current, AT_TERM);
  const change = termsLine({ ...current, commissionBps: 3000 }, RENEWING);
  const record = (
    n: number,
    from: string,
    to: string,
    campaign: DemoCampaign,
    status: Partnership["status"],
    versionHistory: Partnership["versionHistory"],
  ): Partnership => ({
    id: `demo-pship-${String(n)}`,
    fromMerchantId: from,
    toMerchantId: to,
    campaignIds: [campaign.id],
    terms: versionHistory.at(-1)?.terms ?? "",
    status,
    versionHistory,
    performance: noSales,
  });
  return [
    record(1, merchant, "demo-u-2", live, "accepted", history),
    record(2, merchant, core.personas.distributor, live, "proposed", [
      { version: 1, terms: proposal, at: iso(core.anchor - 2 * DAY) },
    ]),
    record(3, merchant, "demo-u-12", ended, "terminated", versions(ended, AT_TERM)),
    record(4, "demo-u-2", merchant, live, "proposed", [
      ...history,
      { version: history.length + 1, terms: change, at: iso(core.anchor - DAY) },
    ]),
  ];
};

const communityRows = [
  {
    key: "studio",
    owner: "persona",
    name: "Sample · Template studio circle",
    description:
      "Templates and design kits we share with our newsletters, under each campaign's own terms.",
    campaignIds: ["demo-c-1", "demo-c-6"],
    createdDaysAgo: 60,
    members: [
      ["demo-u-2", 58],
      ["demo-u-3", 50],
      ["demo-u-4", 45],
      ["demo-u-5", 40],
      ["demo-u-17", 38],
      ["demo-u-26", 30],
    ],
  },
  {
    key: "devtools",
    owner: "demo-u-15",
    name: "Sample · Dev tools circle",
    description: "Developers sharing the tools they use every day.",
    campaignIds: ["demo-c-4"],
    createdDaysAgo: 50,
    members: [
      ["demo-u-25", 45],
      ["demo-u-31", 35],
      ["persona", 28],
    ],
  },
  {
    key: "fieldnotes",
    owner: "demo-u-7",
    name: "Sample · Field notes circle",
    description: "A small group sharing planners and templates with their readers.",
    campaignIds: ["demo-c-1"],
    createdDaysAgo: 40,
    members: [
      ["demo-u-8", 35],
      ["demo-u-9", 20],
    ],
  },
] as const;

export const communityId = (key: string) => `demo-community-${key}`;

export const communityInviteCode = (id: string, regenerations: number) => {
  const base = `DEMO-${id.replace(/^demo-community-/, "").toUpperCase()}`;
  return regenerations > 0 ? `${base}-${String(regenerations + 1)}` : base;
};

export const seedCommunities = (core: DemoCore) => {
  const addressOf = (who: string) =>
    mainAddress(personOf(core, who === "persona" ? core.personas.distributor : who));
  const communities: Community[] = [];
  const communityMembers: Record<string, CommunityMember[]> = {};
  for (const row of communityRows) {
    const id = communityId(row.key);
    const createdAt = core.anchor - row.createdDaysAgo * DAY;
    const members: CommunityMember[] = [
      { address: addressOf(row.owner), role: "owner", joinedAt: iso(createdAt) },
      ...row.members.map(([who, daysAgo]): CommunityMember => ({
        address: addressOf(who),
        role: "member",
        joinedAt: iso(core.anchor - daysAgo * DAY),
      })),
    ];
    communityMembers[id] = members;
    communities.push({
      id,
      owner: addressOf(row.owner),
      name: row.name,
      description: row.description,
      campaignIds: [...row.campaignIds],
      memberCount: members.length,
      createdAt: iso(createdAt),
    });
  }
  return { communities, communityMembers };
};
