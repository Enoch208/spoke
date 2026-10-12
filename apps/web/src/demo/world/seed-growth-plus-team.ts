import { DAY, MINUTE, iso, sampleAddress, sampleHash } from "./ids";
import { mainAddress, personaMerchant, personOf, scopedId } from "./seed-growth-plus-scope";
import type { DemoCore } from "./types";
import type { AuditEntry, TeamMember } from "./world";

export const INVITE_VALID_MS = 7 * DAY;

type Role = TeamMember["role"];
type Status = TeamMember["status"];

const memberRows: readonly (readonly [
  n: number,
  role: Role,
  title: string,
  status: Status,
  joinedDaysAgo: number | null,
])[] = [
  [2, "admin", "Admin", "active", 120],
  [3, "analyst", "Finance", "active", 90],
  [4, "analyst", "Developer", "active", 60],
  [5, "viewer", "Support", "active", 20],
  [6, "viewer", "Support", "invited", null],
  [7, "analyst", "Finance", "invited", null],
  [8, "viewer", "Support", "removed", 60],
];

export const teamTitlesFor = (merchantId: string): Record<string, string> => ({
  [scopedId(merchantId, "member", 1)]: "Owner",
  ...Object.fromEntries(
    memberRows.map(([n, , title]) => [scopedId(merchantId, "member", n), title]),
  ),
});

const auditRows: readonly (readonly [
  daysAgo: number,
  actor: number,
  action: string,
  resource: string,
])[] = [
  [29, 4, "apiKeys.revoke", "key-2"],
  [26, 4, "apiKeys.create", "key-1"],
  [24, 1, "webhooks.create", "hook-1"],
  [22, 2, "team.invite", "member-5"],
  [21, 3, "reports.export", "sales-ledger"],
  [18, 2, "team.updateRole", "member-4"],
  [15, 1, "merchants.update", ""],
  [14, 5, "disputes.respond", "dispute"],
  [12, 4, "webhooks.update", "hook-1"],
  [10, 2, "team.invite", "member-7"],
  [10, 1, "signers.add", "signer-3"],
  [9, 4, "webhooks.rotateSecret", "hook-1"],
  [7, 1, "signers.revoke", "signer-2"],
  [5, 2, "team.remove", "member-8"],
  [4, 2, "integrations.resolveMismatch", "mismatch-3"],
  [3, 1, "integrations.connect", "integration-woocommerce"],
  [2, 2, "team.invite", "member-6"],
];

const creates = new Set([
  "apiKeys.create",
  "webhooks.create",
  "team.invite",
  "reports.export",
  "signers.add",
]);

export const seedTeam = (core: DemoCore) => {
  const merchant = personaMerchant(core);
  const scope = merchant.id;
  const anchor = core.anchor;
  const ownerAddress = mainAddress(personOf(core, merchant.ownerId));
  const addressOf = (n: number) =>
    n === 1 ? ownerAddress : sampleAddress(`team:${scope}:${String(n)}`);
  const team: TeamMember[] = [
    {
      id: scopedId(scope, "member", 1),
      address: ownerAddress,
      role: "owner",
      status: "active",
      joinedAt: iso(merchant.joinedAt),
    },
    ...memberRows.map(([n, role, , status, joinedDaysAgo]) => ({
      id: scopedId(scope, "member", n),
      address: addressOf(n),
      role,
      status,
      joinedAt: joinedDaysAgo === null ? null : iso(anchor - joinedDaysAgo * DAY),
    })),
  ];
  const titles = teamTitlesFor(scope);
  const campaigns = new Set(
    core.campaigns
      .filter((campaign) => campaign.merchantId === scope)
      .map((campaign) => campaign.id),
  );
  const disputed = core.sales.find(
    (sale) =>
      campaigns.has(sale.campaignId) &&
      sale.refundedAt !== null &&
      sale.refundedAt >= anchor - 30 * DAY,
  );
  const resourceOf = (resource: string) => {
    if (resource === "") return scope;
    if (resource === "dispute") return disputed?.id ?? scope;
    if (resource === "sales-ledger") return resource;
    return `${scope}-${resource}`;
  };
  const audit: AuditEntry[] = auditRows.map(([daysAgo, actor, action, resource], index) => {
    const id = scopedId(scope, "audit", index + 1);
    const memberId = scopedId(scope, "member", actor);
    return {
      id,
      actor: addressOf(actor),
      role: titles[memberId] ?? "Owner",
      resource: resourceOf(resource),
      action,
      beforeHash: creates.has(action) ? null : sampleHash(`audit:${id}:before`),
      afterHash: action === "integrations.resolveMismatch" ? null : sampleHash(`audit:${id}:after`),
      at: iso(anchor - daysAgo * DAY - (index + 1) * 11 * MINUTE),
    };
  });
  return { team, audit };
};
