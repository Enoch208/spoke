import { z } from "zod";
import { clientMethodSchemas, dispute } from "@spoke/protocol";
import { accountId, input, merchantFor, route, router } from "../http/router.js";
import { newId, type StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { actorView } from "../services/evidence.js";
import { allRecords, pageValues } from "../services/read-utils.js";
import type { Services } from "../types.js";

export const disputeRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  const view = (row: StoredRecord) =>
    dispute.parse({ ...row.payload, id: row.id, createdAt: row.createdAt.toISOString() });
  route(app, services, "POST", "/me/refund-requests", "session", async (c) => {
    const body = await input(c, clientMethodSchemas["disputes.open"].input);
    const head = await chain.client.getBlock();
    const [sale] = await chain.sale(body.saleId, head.number);
    if ((await store.identity("wallet", sale.buyer.toLowerCase())) !== accountId(c))
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Only the buyer may request a refund.");
    if (sale.status === 2) throw new ApiProblem(409, "SALE_REFUNDED", "Sale was already refunded.");
    if (sale.status === 3)
      throw new ApiProblem(409, "SALE_ALREADY_FINALIZED", "Sale was already finalized.");
    if (head.timestamp >= sale.unlockAt)
      throw new ApiProblem(409, "REFUND_WINDOW_CLOSED", "The onchain refund window has closed.");
    const { campaign } = await chain.campaign(sale.campaignId.toString(), head.number);
    const actor = await actorView(store, sale.buyer);
    const row = await store.revise(
      "dispute",
      body.saleId,
      campaign.merchant.toLowerCase(),
      (previous) => {
        if (previous)
          throw new ApiProblem(409, "CONFLICT", "A refund request already exists for this sale.");
        return {
          ...body,
          requester: accountId(c),
          campaignId: sale.campaignId.toString(),
          status: "open",
          kind: "refund_request",
          events: [
            {
              id: newId(),
              kind: "opened",
              at: new Date().toISOString(),
              actor,
              message: body.message,
              tx: null,
            },
          ],
        };
      },
    );
    const owner = await store.identity("wallet", campaign.merchant.toLowerCase());
    if (owner)
      await store.put("notification", newId(), owner, {
        kind: "refund.requested",
        category: "sales",
        title: "Refund requested",
        body: "A buyer requested a refund before the hold expired.",
        href: `/sell/sales/${row.id}`,
        workspace: "sell",
        readAt: null,
        createdAt: new Date().toISOString(),
      });
    return ok(c, { disputeId: row.id, status: "open" }, 201);
  });
  route(app, services, "GET", "/merchant/disputes/exposure", "merchant", async (c) => {
    const merchant = await merchantFor(c, services);
    const rows = (
      await allRecords(store, "dispute", z.string().parse(merchant.payload.address).toLowerCase())
    ).filter((row) => row.payload.status === "open");
    const amounts = await Promise.all(
      rows.map(async (row) => (await chain.sale(z.string().parse(row.payload.saleId)))[0].price),
    );
    return ok(c, {
      openRefundRequests: rows.length,
      refundValue: amounts.reduce((sum, value) => sum + value, 0n).toString(),
      appeals: 0,
      chargebacks: 0,
      riskDebt: "0",
    });
  });
  route(app, services, "GET", "/merchant/disputes", "merchant", async (c) => {
    const merchant = await merchantFor(c, services);
    const rows = (
      await allRecords(store, "dispute", z.string().parse(merchant.payload.address).toLowerCase())
    ).filter(
      (row) =>
        (!c.req.query("status") || row.payload.status === c.req.query("status")) &&
        (!c.req.query("kind") || row.payload.kind === c.req.query("kind")),
    );
    const page = pageValues(c, rows, (row) => row.id);
    return ok(c, { ...page, items: page.items.map(view) });
  });
  route(app, services, "GET", "/merchant/disputes/:id", "merchant", async (c) =>
    ok(
      c,
      view(
        await store.require(
          "dispute",
          c.req.param("id") ?? "",
          z
            .string()
            .parse((await merchantFor(c, services)).payload.address)
            .toLowerCase(),
        ),
      ),
    ),
  );
  route(app, services, "POST", "/merchant/disputes/:id/responses", "merchant", async (c) => {
    const body = await input(c, clientMethodSchemas["disputes.respond"].input.omit({ id: true }));
    const row = await store.require(
      "dispute",
      c.req.param("id") ?? "",
      z
        .string()
        .parse((await merchantFor(c, services)).payload.address)
        .toLowerCase(),
    );
    if (!["refunded", "declined", "explained"].includes(body.outcome))
      throw new ApiProblem(
        409,
        "FEATURE_NOT_AVAILABLE",
        "Appeals and chargebacks are available in Demo mode.",
      );
    if (
      body.outcome === "refunded" &&
      (await store.require("receipt", z.string().parse(row.payload.saleId))).payload.status !== 2
    )
      throw new ApiProblem(
        409,
        "INDEXER_LAGGING",
        "The refund transaction must be indexed before recording this outcome.",
      );
    const actor = await actorView(store, c.get("session").address, true);
    const saved = await store.revise("dispute", row.id, row.owner, (previous) => ({
      ...previous?.payload,
      status: body.outcome,
      events: [
        ...z.array(z.unknown()).parse(previous?.payload.events ?? []),
        {
          id: newId(),
          at: new Date().toISOString(),
          kind: body.outcome,
          actor,
          message: body.message,
          tx: null,
        },
      ],
    }));
    if (body.outcome === "declined")
      await store.put("notification", newId(), z.string().parse(row.payload.requester), {
        kind: "refund.declined",
        category: "sales",
        title: "Refund request declined",
        body: body.message,
        href: `/receipts/${String(chain.chainId)}/${z.string().parse(row.payload.saleId)}`,
        workspace: "earn",
        readAt: null,
        createdAt: new Date().toISOString(),
      });
    return ok(c, view(saved));
  });
  return app;
};
