import { DAY, HOUR, demoId, iso } from "./ids";
import type { DemoCore } from "./types";
import type { SupportItem } from "./world";

export const FREEZE_TERM = 72 * HOUR;

export type ModerationTab = "Report" | "Hidden" | "Frozen" | "Notice" | "Appeal";
export type SubjectKind = "campaign" | "merchant" | "distributor" | "alert";

export const moderationCategory = (tab: ModerationTab, detail: string) => `${tab} · ${detail}`;

export const tabOf = (item: SupportItem): ModerationTab | null => {
  const tab = item.category.split(" · ")[0];
  return tab === "Report" ||
    tab === "Hidden" ||
    tab === "Frozen" ||
    tab === "Notice" ||
    tab === "Appeal"
    ? tab
    : null;
};

export const subjectParts = (subject: string): { kind: SubjectKind; id: string } | null => {
  const [kind, id] = subject.split(":");
  if (!id) return null;
  return kind === "campaign" || kind === "merchant" || kind === "distributor" || kind === "alert"
    ? { kind, id }
    : null;
};

export const subjectLabel = (core: DemoCore, subject: string): string => {
  const parts = subjectParts(subject);
  if (!parts) return subject;
  if (parts.kind === "merchant")
    return core.merchants.find((merchant) => merchant.id === parts.id)?.name ?? parts.id;
  if (parts.kind === "distributor") {
    const person = core.people.find((candidate) => candidate.id === parts.id);
    return person?.handle ?? parts.id;
  }
  const campaign = core.campaigns.find((candidate) => candidate.id === parts.id);
  const product = core.products.find((candidate) => candidate.id === campaign?.productId);
  return product ? `${product.title} campaign` : parts.id;
};

export const detailOf = (subject: string) => {
  const kind = subjectParts(subject)?.kind;
  if (kind === "merchant") return "Merchant profile";
  if (kind === "distributor") return "Distributor profile";
  return "Campaign";
};

export const hiddenText = (label: string) =>
  `${label} · hidden from discovery. Existing purchases, refunds and payouts are not affected.`;

export const frozenText = (label: string, until: number) =>
  `${label} · new orders and new links frozen on Spoke until ${iso(until)}.`;

export const noticeText = (publicNote: string) => `Under review: ${publicNote}`;

export const freezeEndsAt = (item: SupportItem) => Date.parse(item.updatedAt) + FREEZE_TERM;

export const reportTargets: Readonly<Record<string, string>> = {
  [demoId("report", 2)]: `distributor:${demoId("u", 31)}`,
  [demoId("report", 3)]: `distributor:${demoId("u", 38)}`,
};

interface ItemRow {
  id: string;
  tab: ModerationTab;
  detail: string;
  subject: string;
  status: SupportItem["status"];
  createdAt: number;
  updatedAt: number;
}

const item = (row: ItemRow): SupportItem => ({
  id: row.id,
  subject: row.subject,
  category: moderationCategory(row.tab, row.detail),
  status: row.status,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

export const COUNTERFEIT_NOTICE =
  "A buyer reported that this pricing report reuses another publisher's data. We've asked the merchant for its sources.";

export const moderationTimes = (anchor: number) => ({
  counterfeitReport: anchor - 4 * DAY,
  counterfeitLinked: anchor - 4 * DAY + 30 * 60_000,
  notice: anchor - 3 * DAY,
  impersonation: anchor - 20 * HOUR,
  spam: anchor - 5 * HOUR,
  hidden: anchor - 9 * DAY,
  appeal: anchor - 2 * DAY,
  frozen: anchor - DAY,
});

export const seedModeration = (core: DemoCore): SupportItem[] => {
  const at = moderationTimes(core.anchor);
  const clara = `distributor:${demoId("u", 28)}`;
  const frozenCampaign = `campaign:${demoId("c", 8)}`;
  const label = (subject: string) => subjectLabel(core, subject);
  return [
    item({
      id: `${demoId("case", 3)}-report`,
      tab: "Report",
      detail: "Counterfeit",
      subject: `Sample report about ${label(`merchant:${demoId("m", 3)}`)}: a buyer says State of indie SaaS pricing copies another publisher's data.`,
      status: "answered",
      createdAt: at.counterfeitReport,
      updatedAt: at.counterfeitLinked,
    }),
    item({
      id: demoId("report", 2),
      tab: "Report",
      detail: "Impersonation",
      subject: `Sample report about ${label(`distributor:${demoId("u", 31)}`)}: the profile uses Patchwork Dev Tools' name and logo.`,
      status: "open",
      createdAt: at.impersonation,
      updatedAt: at.impersonation,
    }),
    item({
      id: demoId("report", 3),
      tab: "Report",
      detail: "Spam",
      subject: `Sample report about ${label(`distributor:${demoId("u", 38)}`)}: referral links posted in unrelated forum threads.`,
      status: "open",
      createdAt: at.spam,
      updatedAt: at.spam,
    }),
    item({
      id: `${demoId("case", 6)}-hidden`,
      tab: "Hidden",
      detail: detailOf(clara),
      subject: hiddenText(label(clara)),
      status: "open",
      createdAt: at.hidden,
      updatedAt: at.hidden,
    }),
    item({
      id: `${demoId("case", 6)}-appeal`,
      tab: "Appeal",
      detail: "Distributor",
      subject: `${label(clara)} appealed hiding their profile from discovery.`,
      status: "open",
      createdAt: at.appeal,
      updatedAt: at.appeal,
    }),
    item({
      id: `${demoId("case", 4)}-frozen`,
      tab: "Frozen",
      detail: detailOf(frozenCampaign),
      subject: frozenText(label(frozenCampaign), at.frozen + FREEZE_TERM),
      status: "open",
      createdAt: at.frozen,
      updatedAt: at.frozen,
    }),
    item({
      id: `${demoId("case", 3)}-notice`,
      tab: "Notice",
      detail: "Merchant profile",
      subject: noticeText(COUNTERFEIT_NOTICE),
      status: "open",
      createdAt: at.notice,
      updatedAt: at.notice,
    }),
  ];
};
