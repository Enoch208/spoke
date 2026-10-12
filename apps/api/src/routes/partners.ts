import { z } from "zod";
import { walletAddress, chartPoint } from "@spoke/protocol";
import { merchantFor, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { allRecords, counts, pageValues, timestamp } from "../services/read-utils.js";
import { analyticsPoint } from "../services/analytics.js";
import { partnerView } from "../services/partners.js";
import type { ApiContext, Services } from "../types.js";

export const partnerRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  const campaignIds = async (c: ApiContext) => {
    const merchant = await merchantFor(c, services);
    return new Set(
      (
        await allRecords(
          store,
          "campaign",
          z.string().parse(merchant.payload.address).toLowerCase(),
        )
      )
        .filter((row) => !c.req.query("campaignId") || row.id === c.req.query("campaignId"))
        .map((row) => row.id),
    );
  };
  route(app, services, "GET", "/merchant/partners/:address", "merchant", async (c) =>
    ok(
      c,
      (
        await partnerView(
          services,
          walletAddress.parse(c.req.param("address") ?? ""),
          await campaignIds(c),
        )
      ).detail,
    ),
  );
  route(app, services, "GET", "/merchant/partners", "merchant", async (c) => {
    const query = z
      .object({
        q: z.string().max(200).optional(),
        status: z.enum(["all", "active", "quiet"]).default("all"),
        sort: z
          .enum([
            "value",
            "settledValue",
            "sales",
            "settled",
            "settledSales",
            "recent",
            "lastSettled",
            "joined",
          ])
          .default("value"),
      })
      .parse(c.req.query());
    const ids = await campaignIds(c);
    const nodes = (await allRecords(store, "node")).filter((row) =>
      ids.has(z.string().parse(row.payload.campaignId)),
    );
    const addresses = [...new Set(nodes.map((row) => z.string().parse(row.payload.creator)))];
    const details = await Promise.all(
      addresses.map((address) => partnerView(services, address, ids)),
    );
    const q = query.q?.toLowerCase();
    const cutoff = Date.now() - 30 * 86400000;
    const filtered = details.filter(
      ({ detail, lastLinkAt }) =>
        (!q ||
          detail.partner.address?.toLowerCase().includes(q) ||
          detail.partner.handle?.toLowerCase().includes(q)) &&
        (query.status === "all" ||
          (query.status === "active"
            ? Math.max(
                Date.parse(lastLinkAt ?? detail.partner.firstLinkAt),
                Date.parse(detail.partner.lastSettledAt ?? "1970-01-01"),
              ) >= cutoff
            : Math.max(
                Date.parse(lastLinkAt ?? detail.partner.firstLinkAt),
                Date.parse(detail.partner.lastSettledAt ?? "1970-01-01"),
              ) < cutoff)),
    );
    filtered.sort((a, b) => {
      const left = a.detail.partner;
      const right = b.detail.partner;
      const primary = ["sales", "settled", "settledSales"].includes(query.sort)
        ? (right.settledConversions ?? 0) - (left.settledConversions ?? 0)
        : ["recent", "lastSettled"].includes(query.sort)
          ? Date.parse(right.lastSettledAt ?? "1970-01-01") -
            Date.parse(left.lastSettledAt ?? "1970-01-01")
          : query.sort === "joined"
            ? Date.parse(right.firstLinkAt) - Date.parse(left.firstLinkAt)
            : BigInt(left.settledValue) > BigInt(right.settledValue)
              ? -1
              : BigInt(left.settledValue) < BigInt(right.settledValue)
                ? 1
                : 0;
      return primary || (left.address ?? "").localeCompare(right.address ?? "");
    });
    const receipts = (await allRecords(store, "receipt")).filter((row) =>
      ids.has(z.string().parse(row.payload.campaignId)),
    );
    const totals = chartPoint.parse({
      at: new Date().toISOString(),
      sales: counts(receipts),
      value: receipts
        .filter((row) => row.payload.status === 3)
        .reduce((sum, row) => sum + BigInt(z.string().parse(row.payload.price)), 0n)
        .toString(),
      rewards: receipts
        .filter((row) => row.payload.status === 3)
        .reduce((sum, row) => sum + BigInt(z.string().parse(row.payload.rewardReserved)), 0n)
        .toString(),
      links: nodes.length,
    });
    const page = pageValues(c, filtered, (row) => row.facts.address);
    const week = 7 * 86400000;
    const start = Math.floor(Date.now() / week) * week - 11 * week;
    const series = Array.from({ length: 12 }, (_, index) => {
      const from = start + index * week;
      const to = from + week;
      return analyticsPoint(
        new Date(from).toISOString(),
        receipts.filter((row) => {
          const at = Date.parse(timestamp(row.payload.purchasedAt));
          return at >= from && at < to;
        }),
        nodes.filter((row) => {
          const at = Date.parse(timestamp(row.payload.createdAt));
          return at >= from && at < to;
        }),
      );
    });
    return ok(c, {
      ...page,
      items: page.items.map((row) => row.detail.partner),
      summary: {
        partners: addresses.length,
        sales: totals.sales,
        value: totals.value,
        series,
      },
    });
  });
  return app;
};
