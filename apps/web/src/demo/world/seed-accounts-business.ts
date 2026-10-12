import { DAY, HOUR, MINUTE } from "./ids";
import { productTitle, when, type NoticeSpec } from "./seed-accounts-copy";
import type { DemoCampaign, DemoCore, DemoMerchant } from "./types";

export const sell = (
  kind: NoticeSpec["kind"],
  title: string,
  body: string,
  href: string,
  at: number,
  extra: Partial<Pick<NoticeSpec, "category" | "amount">> = {},
): NoticeSpec => ({
  kind,
  category: "campaigns",
  workspace: "sell",
  title,
  body,
  href,
  at,
  ...extra,
});

const business = { category: "business" } as const;

export const partnerNotices = (
  core: DemoCore,
  campaigns: readonly DemoCampaign[],
): NoticeSpec[] => {
  const personOf = (id: string) => core.people.find((person) => person.id === id);
  const [first, second] = campaigns;
  const ravi = personOf("demo-u-38");
  const felix = personOf("demo-u-31");
  const tunde = personOf("demo-u-32");
  if (!first || !second || !ravi?.handle || !felix?.handle || !tunde?.handle) return [];
  const a = core.anchor;
  return [
    sell(
      "invitation.accepted",
      "Invitation accepted",
      `@${ravi.handle} accepted your invitation to ${productTitle(core, first)}.`,
      `/sell/partners/${ravi.addresses[0] ?? ""}`,
      a - 45 * DAY - HOUR,
    ),
    sell(
      "invitation.declined",
      "Invitation declined",
      `@${felix.handle} declined your invitation to ${productTitle(core, first)}.`,
      "/sell/partners?tab=invitations",
      a - 20 * DAY,
    ),
    sell(
      "invitation.expired",
      "Invitation expired",
      `Your invitation to @${tunde.handle} for ${productTitle(core, second)} expired unanswered.`,
      "/sell/partners?tab=invitations",
      a - 12 * DAY,
    ),
  ];
};

export const businessNotices = (
  core: DemoCore,
  merchant: DemoMerchant,
  campaigns: readonly DemoCampaign[],
): NoticeSpec[] => {
  const a = core.anchor;
  const partnered = campaigns[1] ? productTitle(core, campaigns[1]) : "a sample campaign";
  const site = merchant.website ?? "https://example.com";
  return [
    sell(
      "team.memberJoined",
      "Teammate joined",
      "Sample teammate joined as Finance.",
      "/sell/team?tab=members",
      a - 9 * DAY,
      business,
    ),
    sell(
      "webhook.failing",
      "Webhook endpoint failing",
      `${site}/webhooks/spoke failed 5 deliveries in a row. Retries continue until ${when(a + 18 * HOUR)}.`,
      "/sell/developers?tab=webhooks",
      a - 6 * HOUR,
      business,
    ),
    sell(
      "credential.expiring",
      "Sample order signer expires soon",
      "It expires in 5 days. Renew it to keep attested store orders working.",
      "/sell/integrations/signers",
      a - 10 * HOUR,
      business,
    ),
    sell(
      "partnership.answered",
      "Partnership accepted",
      `Sample partner accepted your proposal for ${partnered}.`,
      "/sell/partnerships",
      a - 16 * DAY,
      business,
    ),
    sell(
      "export.ready",
      "Your export is ready",
      `Sales report (CSV) is ready to download until ${when(a - 3 * DAY + 15 * MINUTE)}.`,
      "/sell/reports",
      a - 3 * DAY,
      business,
    ),
  ];
};
