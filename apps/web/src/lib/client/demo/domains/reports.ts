import {
  catalogueKinds,
  exportRun,
  exportUrl,
  reportRows,
} from "../../../../demo/world/seed-growth-core-exports";
import type { ReportRun } from "../../../../demo/world/world";
import { fail, type PartialHandlers } from "../handler";
import { blockAt, page } from "../views/basics";
import { merchantsOwnedBy, requireMerchant } from "../views/merchant-org";
import { drillCampaign, reconcile } from "./growth-reconcile";
import { merchantFor, periodOf, selectCampaigns } from "./growth-scope";

const GENERATION_MS = 4_000;
const QUEUE_ABOVE_ROWS = 100;

const present = (run: ReportRun, now: number): ReportRun => {
  const ready = run.status !== "queued" || now >= Date.parse(run.createdAt) + GENERATION_MS;
  const expired = run.expiresAt !== undefined && now >= Date.parse(run.expiresAt);
  return {
    ...run,
    status: ready && run.status === "queued" ? "ready" : run.status,
    url: ready && !expired ? run.url : null,
    sha256: ready ? run.sha256 : null,
  };
};

export const reportsReads = {
  "reports.preview": (input, runtime) => {
    const merchant = merchantFor(runtime);
    const campaigns = selectCampaigns(runtime.world, merchant, input.campaignIds);
    const period = periodOf(input.range, runtime.now());
    const scope = { campaignIds: campaigns.map((campaign) => campaign.id), ...period };
    return {
      counts: catalogueKinds.map((kind) => ({
        kind,
        rows: reportRows(runtime.world, kind, scope),
      })),
      reconciliation: reconcile(runtime.world, campaigns, runtime.now()),
    };
  },
  "reports.list": (input, runtime) => {
    const merchant = merchantFor(runtime);
    const runs = runtime.world.reports
      .filter((run) => run.jobId.startsWith(`${merchant.id}-export-`))
      .map((run) => present(run, runtime.now()))
      .reverse()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return page(runs, input);
  },
} satisfies PartialHandlers<"reports">;

export const reportsWrites = {
  "reports.export": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    if (
      !merchantsOwnedBy(world, runtime.personaId()).length &&
      input.kind === "distributorEarnings"
    )
      return { url: exportUrl(input.kind, runtime.nextId("export"), input.format) };
    const merchant = requireMerchant(world, runtime.personaId());
    const campaigns = selectCampaigns(world, merchant, input.campaignIds);
    const drill = drillCampaign(campaigns);
    if (drill)
      return fail(
        "EXPORT_RECONCILIATION_MISMATCH",
        `These numbers don't match the chain at block ${blockAt(now)}. Exports are paused until it's fixed.`,
        { campaignId: drill.id },
      );
    const scope = {
      campaignIds: campaigns.map((campaign) => campaign.id),
      ...periodOf(input.range, now),
    };
    const rows = reportRows(world, input.kind, scope);
    const run = exportRun({
      merchantId: merchant.id,
      n: runtime.nextId("export"),
      kind: input.kind,
      format: input.format,
      scope,
      rows,
      at: now,
      queued: rows > QUEUE_ABOVE_ROWS,
    });
    world.reports.push(run);
    if (run.status !== "queued" && run.url !== null) return { url: run.url };
    const job = present(run, now);
    return { jobId: job.jobId, status: job.status, url: job.url, expiresAt: run.expiresAt };
  },
} satisfies PartialHandlers<"reports">;
