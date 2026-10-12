import { randomBytes } from "node:crypto";
import { z } from "zod";
import { reportRequest, reportRun } from "@spoke/protocol";
import { accountId, input, merchantFor, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { digest, newId } from "../db/store.js";
import { ok } from "../http/respond.js";
import { allRecords, pageValues, timestamp } from "../services/read-utils.js";
import { dateRange, analyticsView } from "../services/analytics.js";
import { purchaseView, filterSalesQuery } from "../services/sales.js";
import { allocations } from "../services/views.js";
import { earnedSnapshot } from "../services/earnings.js";
import { vaultSnapshot } from "../services/vault.js";
import { reconciliationView } from "../services/report-reconciliation.js";
import { partnerView } from "../services/partners.js";
import { selectedCampaignIds } from "./analytics.js";
import type { Services } from "../types.js";

const csv = (rows: Record<string, unknown>[]) => {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const cell = (value: unknown) => {
    const text =
      value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
    return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  return [
    columns.map(cell).join(","),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
  ].join("\r\n");
};
export const reportRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  route(app, services, "GET", "/merchant/reports/preview", "merchant", async (c) => {
    const ids = await selectedCampaignIds(services, c);
    const merchant = await merchantFor(c, services);
    const period = dateRange(c.req.query());
    const receipts = (await allRecords(store, "receipt")).filter(
      (row) =>
        ids.has(z.string().parse(row.payload.campaignId)) &&
        timestamp(row.payload.purchasedAt) >= period.from &&
        timestamp(row.payload.purchasedAt) <= period.to,
    );
    const partners = new Set(
      (await allRecords(store, "node"))
        .filter((row) => ids.has(z.string().parse(row.payload.campaignId)))
        .map((row) => row.owner),
    );
    const wallets = new Set((await allRecords(store, "wallet", accountId(c))).map((row) => row.id));
    return ok(c, {
      counts: [
        { kind: "sales", rows: receipts.length },
        { kind: "vault", rows: ids.size },
        { kind: "partners", rows: partners.size },
        {
          kind: "analytics",
          rows: (await analyticsView(services, ids, { range: JSON.stringify(period) })).series
            .length,
        },
        {
          kind: "distributorEarnings",
          rows: receipts.reduce(
            (sum, row) =>
              sum +
              allocations
                .parse(row.payload.allocations)
                .filter((item) => wallets.has(item.recipient.toLowerCase())).length,
            0,
          ),
        },
      ],
      reconciliation: await reconciliationView(
        services,
        z.string().parse(merchant.payload.address),
        ids,
      ),
    });
  });
  route(app, services, "GET", "/merchant/reports", "merchant", async (c) => {
    const page = pageValues(c, await allRecords(store, "report", accountId(c)), (row) => row.id);
    return ok(c, { ...page, items: page.items.map((row) => reportRun.parse(row.payload)) });
  });
  route(app, services, "POST", "/merchant/reports", "session", async (c) => {
    const body = await input(c, reportRequest);
    const checkpoint = await store.get("indexer", "cursor");
    if (!checkpoint)
      throw new ApiProblem(
        503,
        "INDEXER_LAGGING",
        "Exports become available after the first canonical index checkpoint.",
        true,
      );
    const period = dateRange({
      range: JSON.stringify(body.range ?? body.filters?.range ?? dateRange({})),
    });
    const filters = Object.fromEntries(
      Object.entries(body.filters ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          typeof value === "object" ? JSON.stringify(value) : String(value),
        ]),
    );
    let rows: Record<string, unknown>[];
    let blockNumber: string;
    let ids = new Set<string>();
    if (body.kind === "distributorEarnings") {
      const wallets = (await allRecords(store, "wallet", accountId(c))).map((row) => row.id);
      const earned = await earnedSnapshot(services, wallets);
      blockNumber = earned.blockNumber;
      ids = new Set(body.campaignIds ?? earned.rows.map((row) => row.campaignId));
      const receipts = new Set((await filterSalesQuery(services, filters)).map((row) => row.id));
      rows = earned.rows
        .filter(
          (row) =>
            ids.has(row.campaignId) &&
            receipts.has(row.saleId) &&
            row.purchasedAt >= period.from &&
            row.purchasedAt <= period.to,
        )
        .map((row) => ({ ...row }));
    } else {
      const merchant = await merchantFor(c, services);
      ids = await selectedCampaignIds(services, c);
      if (body.campaignIds) {
        if (body.campaignIds.some((id) => !ids.has(id)))
          throw new ApiProblem(404, "NOT_FOUND", "No such campaign.");
        ids = new Set(body.campaignIds);
      }
      const audit = await reconciliationView(
        services,
        z.string().parse(merchant.payload.address),
        ids,
      );
      if (!audit.matches)
        throw new ApiProblem(
          409,
          "EXPORT_RECONCILIATION_MISMATCH",
          "Indexed and canonical ledgers differ.",
        );
      blockNumber = audit.blockNumber;
      if (body.kind === "sales")
        rows = await Promise.all(
          (await filterSalesQuery(services, filters))
            .filter(
              (row) =>
                ids.has(z.string().parse(row.payload.campaignId)) &&
                new Date(Number(row.payload.purchasedAt) * 1000).toISOString() >= period.from &&
                new Date(Number(row.payload.purchasedAt) * 1000).toISOString() <= period.to,
            )
            .map(async (row) => ({ ...(await purchaseView(services, row, true)) })),
        );
      else if (body.kind === "vault")
        rows = (
          await vaultSnapshot(
            services,
            z.string().parse(merchant.payload.address),
            undefined,
            BigInt(blockNumber),
          )
        ).campaigns
          .filter((row) => ids.has(row.campaignId))
          .map((row) => ({ ...row }));
      else if (body.kind === "analytics")
        rows = (await analyticsView(services, ids, { range: JSON.stringify(period) })).series.map(
          (row) => ({ ...row }),
        );
      else {
        const addresses = [
          ...new Set(
            (await allRecords(store, "node"))
              .filter((row) => ids.has(z.string().parse(row.payload.campaignId)))
              .map((row) => z.string().parse(row.payload.creator)),
          ),
        ];
        rows = await Promise.all(
          addresses.map(async (address) => ({
            ...(await partnerView(services, address, ids, BigInt(blockNumber))).detail.partner,
          })),
        );
      }
    }
    const content =
      body.format === "json"
        ? JSON.stringify({
            schemaVersion: "3.0",
            chainId: services.chain.chainId,
            blockNumber,
            period,
            rows,
          })
        : csv(rows);
    const [latest, block] = await Promise.all([
      store.get("indexer", "cursor"),
      services.chain.client.getBlock({ blockNumber: BigInt(blockNumber) }),
    ]);
    if (
      latest?.payload.blockNumber !== checkpoint.payload.blockNumber ||
      latest?.payload.blockHash !== checkpoint.payload.blockHash ||
      block.hash !== checkpoint.payload.blockHash
    )
      throw new ApiProblem(
        409,
        "INDEXER_LAGGING",
        "The index changed while building the export. Retry at a stable checkpoint.",
        true,
      );
    const id = newId();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const url = `${services.apiOrigin ?? new URL(c.req.url).origin}/v1/report-files/${id}?token=${token}`;
    const run = reportRun.parse({
      jobId: id,
      status: "ready",
      url,
      expiresAt,
      kind: body.kind,
      period,
      campaignIds: [...ids],
      blockNumber,
      rows: rows.length,
      size: Buffer.byteLength(content),
      sha256: digest(content),
      createdAt: new Date().toISOString(),
    });
    await store.put("report", id, accountId(c), {
      ...run,
      format: body.format,
      content,
      tokenHash: digest(token),
    });
    return ok(c, { url }, 201);
  });
  route(app, services, "GET", "/report-files/:id", "public", async (c) => {
    const row = await store.require("report", c.req.param("id") ?? "");
    const token = z
      .string()
      .regex(/^[\da-f]{64}$/)
      .parse(c.req.query("token"));
    if (
      digest(token) !== row.payload.tokenHash ||
      Date.parse(z.string().parse(row.payload.expiresAt)) <= Date.now()
    )
      throw new ApiProblem(404, "NOT_FOUND", "Report link is invalid or expired.");
    const format = z.enum(["csv", "json"]).parse(row.payload.format);
    return new Response(z.string().parse(row.payload.content), {
      headers: {
        "content-type": format === "json" ? "application/json" : "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="spoke-${row.id}.${format}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  });
  return app;
};
