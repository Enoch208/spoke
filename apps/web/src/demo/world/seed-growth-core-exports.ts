import { blockAt } from "../../lib/client/demo/views/basics";
import { DAY, iso, sampleHash } from "./ids";
import type { DemoCore, DemoFunding, DemoNode, DemoSale } from "./types";
import type { ReportRun } from "./world";

export type ReportKind = ReportRun["kind"];
export type ExportFormat = "csv" | "json";

export const catalogueKinds = [
  "sales",
  "allocations",
  "vault",
  "proceeds",
  "partners",
  "distributorEarnings",
  "refunds",
  "analytics",
  "statement",
] as const;
export type CatalogueKind = (typeof catalogueKinds)[number];

export interface ExportScope {
  campaignIds: readonly string[];
  from: number;
  to: number;
}

interface Facts {
  sales: DemoSale[];
  fundings: DemoFunding[];
  nodes: DemoNode[];
  proceedsClaims: number;
  days: number;
  months: number;
}

const ROW_BYTES: Record<ReportKind, number> = {
  sales: 420,
  vault: 260,
  distributorEarnings: 190,
  partners: 230,
  analytics: 150,
};

const HEADER_BYTES = 320;

const monthIndex = (at: number) => {
  const date = new Date(at);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};

const factsOf = (core: DemoCore, scope: ExportScope): Facts => {
  const ids = new Set(scope.campaignIds);
  const inScope = (at: number) => at >= scope.from && at <= scope.to;
  return {
    sales: core.sales.filter((sale) => ids.has(sale.campaignId) && inScope(sale.purchasedAt)),
    fundings: core.fundings.filter((funding) => ids.has(funding.campaignId) && inScope(funding.at)),
    nodes: core.nodes.filter((node) => ids.has(node.campaignId) && node.createdAt <= scope.to),
    proceedsClaims: core.claims.filter(
      (claim) =>
        claim.source === "SALE_PROCEEDS" &&
        claim.campaignId !== null &&
        ids.has(claim.campaignId) &&
        inScope(claim.at),
    ).length,
    days: Math.floor(scope.to / DAY) - Math.floor(scope.from / DAY) + 1,
    months: monthIndex(scope.to) - monthIndex(scope.from) + 1,
  };
};

const allocationRows = (facts: Facts) =>
  facts.sales.reduce((rows, sale) => rows + sale.allocations.length, 0);

const counters: Record<CatalogueKind, (facts: Facts) => number> = {
  sales: (facts) => facts.sales.length,
  allocations: allocationRows,
  vault: (facts) =>
    facts.fundings.length +
    facts.sales
      .filter((sale) => sale.allocations.length > 0)
      .reduce((rows, sale) => rows + (sale.status === "PENDING" ? 1 : 2), 0),
  proceeds: (facts) => facts.sales.length + facts.proceedsClaims,
  partners: (facts) => new Set(facts.nodes.map((node) => `${node.owner}:${node.campaignId}`)).size,
  distributorEarnings: allocationRows,
  refunds: (facts) => facts.sales.filter((sale) => sale.status === "REFUNDED").length,
  analytics: (facts) => facts.days,
  statement: (facts) => facts.months,
};

export const reportRows = (core: DemoCore, kind: CatalogueKind, scope: ExportScope): number =>
  counters[kind](factsOf(core, scope));

export const exportUrl = (kind: string, n: number | string, format: ExportFormat): string =>
  `https://usespoke.xyz/demo/exports/spoke-demo-SAMPLE-DATA-${kind}-${String(n)}.${format}`;

export interface ExportRequest {
  merchantId: string;
  n: number | string;
  kind: ReportKind;
  format: ExportFormat;
  scope: ExportScope;
  rows: number;
  at: number;
  queued: boolean;
}

export const exportRun = (request: ExportRequest): ReportRun => {
  const jobId = `${request.merchantId}-export-${String(request.n)}`;
  return {
    jobId,
    status: request.queued ? "queued" : "ready",
    url: exportUrl(request.kind, request.n, request.format),
    expiresAt: iso(request.at + DAY),
    kind: request.kind,
    period: { from: iso(request.scope.from), to: iso(request.scope.to) },
    campaignIds: [...request.scope.campaignIds],
    blockNumber: blockAt(request.at),
    rows: request.rows,
    size: HEADER_BYTES + request.rows * ROW_BYTES[request.kind],
    sha256: sampleHash(`export:${jobId}`).slice(2),
    createdAt: iso(request.at),
  };
};
