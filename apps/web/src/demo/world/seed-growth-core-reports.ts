import { DAY, HOUR } from "./ids";
import { exportRun, reportRows, type ReportKind } from "./seed-growth-core-exports";
import type { DemoCore } from "./types";
import type { ReportRun } from "./world";

interface PastExport {
  n: string;
  kind: ReportKind;
  ago: number;
  days: number;
  firstCampaignOnly: boolean;
}

const pastExports: readonly PastExport[] = [
  { n: "s1", kind: "sales", ago: 2 * HOUR, days: 30, firstCampaignOnly: false },
  { n: "s2", kind: "partners", ago: 20 * HOUR, days: 90, firstCampaignOnly: true },
  { n: "s3", kind: "vault", ago: 6 * DAY, days: 30, firstCampaignOnly: false },
];

export const seedReports = (core: DemoCore): ReportRun[] => {
  const merchant = core.merchants.find((candidate) => candidate.ownerId === core.personas.merchant);
  if (!merchant) return [];
  const reconciled = core.campaigns
    .filter((campaign) => campaign.merchantId === merchant.id && !campaign.drill)
    .map((campaign) => campaign.id);
  return pastExports.map((past) => {
    const at = core.anchor - past.ago;
    const scope = {
      campaignIds: past.firstCampaignOnly ? reconciled.slice(0, 1) : reconciled,
      from: at - past.days * DAY,
      to: at,
    };
    return exportRun({
      merchantId: merchant.id,
      n: past.n,
      kind: past.kind,
      format: "csv",
      scope,
      rows: reportRows(core, past.kind, scope),
      at,
      queued: false,
    });
  });
};
