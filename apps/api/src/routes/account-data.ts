import { and, eq, inArray, notInArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { clientMethodSchemas, walletAddress, spokeProtocolAbi } from "@spoke/protocol";
import {
  challenges,
  confirmations,
  identities,
  idempotency,
  records,
  sessions,
} from "../db/schema.js";
import { projectionKinds } from "../services/indexer.js";
import { newId, present } from "../db/store.js";
import { accountId, input, route, router, stepUp } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";

export const accountDataRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  route(app, services, "POST", "/me/export", "session", async (c) => {
    const body = await input(c, clientMethodSchemas["account.exportData"].input);
    await stepUp(c, services, "account.exportData", body.confirmationToken);
    const rows = await store.db
      .select()
      .from(records)
      .where(eq(records.owner, accountId(c)));
    const id = newId();
    const archive = rows
      .filter(
        (row) =>
          ![
            "passkey",
            "audit",
            "export",
            "gas-account",
            "access-grant",
            "gas-request",
            "gas-history",
          ].includes(row.kind),
      )
      .map((row) => ({ kind: row.kind, ...present(row) }));
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    await store.put("export", id, accountId(c), { archive, expiresAt });
    return ok(c, {
      jobId: id,
      status: "ready",
      url: new URL(`/v1/me/exports/${id}`, services.apiOrigin ?? services.webOrigin).href,
      expiresAt,
    });
  });
  route(app, services, "GET", "/me/exports/:id", "session", async (c) => {
    const row = await store.require("export", z.uuid().parse(c.req.param("id")), accountId(c));
    if (Date.parse(z.string().parse(row.payload.expiresAt)) <= Date.now())
      throw new ApiProblem(410, "NOT_FOUND", "Export has expired.");
    c.header("content-disposition", "attachment; filename=spoke-account.json");
    return c.json({
      exportedAt: row.createdAt.toISOString(),
      chainId: chain.chainId,
      account: row.payload.archive,
    });
  });
  route(app, services, "DELETE", "/me", "session", async (c) => {
    const body = await input(c, clientMethodSchemas["account.deleteAccount"].input);
    await stepUp(c, services, "account.deleteAccount", body.confirmationToken);
    const owner = accountId(c);
    const wallets = await store.list("wallet", owner, undefined, 10);
    const addresses = wallets.items.map((row) =>
      z.string().parse(row.payload.address).toLowerCase(),
    );
    const contract = await chain.ready();
    const count = await chain.client.readContract({
      address: contract,
      abi: spokeProtocolAbi,
      functionName: "totalCampaigns",
    });
    for (let id = 1n; id <= count; id++) {
      const fresh = await chain.campaign(id.toString());
      if (addresses.includes(fresh.campaign.merchant.toLowerCase()) && !fresh.campaign.ended)
        throw new ApiProblem(
          409,
          "ACCOUNT_HAS_ACTIVE_CAMPAIGNS",
          "End your campaigns before deleting this account.",
        );
    }
    await store.exclusive(`account:${owner}`, async () =>
      store.db.transaction(async (tx) => {
        const sessionRows = await tx
          .select({ hash: sessions.hash })
          .from(sessions)
          .where(eq(sessions.accountId, owner));
        if (sessionRows.length)
          await tx.delete(confirmations).where(
            inArray(
              confirmations.sessionHash,
              sessionRows.map((row) => row.hash),
            ),
          );
        await tx.delete(sessions).where(eq(sessions.accountId, owner));
        await tx.delete(challenges).where(eq(challenges.accountId, owner));
        await tx
          .delete(identities)
          .where(and(eq(identities.owner, owner), ne(identities.namespace, "slug")));
        await tx.delete(idempotency).where(eq(idempotency.owner, owner));
        await tx
          .update(records)
          .set({
            payload: sql`${records.payload} || jsonb_build_object('closedAt', COALESCE(${records.payload}->>'closedAt', ${new Date().toISOString()}::text))`,
            updatedAt: new Date(),
          })
          .where(and(eq(records.owner, owner), eq(records.kind, "merchant")));
        await tx
          .delete(records)
          .where(
            and(
              eq(records.owner, owner),
              notInArray(records.kind, [
                ...projectionKinds,
                "campaign-metadata",
                "campaign-metadata-commitment",
                "merchant",
                "product",
                "product-version",
                "asset",
                "link",
                "audit",
                "gas-account",
                "gas-history",
                "gas-request",
              ]),
            ),
          );
      }),
    );
    return ok(c, { ok: true });
  });
  route(app, services, "GET", "/me/activity", "session", async (c) => {
    const address = walletAddress.parse(c.req.query("address") ?? c.get("session").address);
    if ((await store.identity("wallet", address.toLowerCase())) !== accountId(c))
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Wallet is not linked to this account.");
    const { activityFor } = await import("../services/activity.js");
    return ok(c, await activityFor(services, address, accountId(c), c.req.query()));
  });
  route(app, services, "POST", "/me/notifications/read", "session", async (c) => {
    const body = await input(c, clientMethodSchemas["notifications.markRead"].input);
    await store.db
      .update(records)
      .set({
        payload: sql`${records.payload} || jsonb_build_object('readAt', ${new Date().toISOString()}::text)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(records.kind, "notification"),
          eq(records.owner, accountId(c)),
          "ids" in body ? inArray(records.id, body.ids) : undefined,
        ),
      );
    return ok(c, { ok: true });
  });
  route(app, services, "GET", "/me/notifications", "session", async (c) => {
    const { limit, cursor, unreadOnly, category } = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(25),
        cursor: z.string().max(100).optional(),
        unreadOnly: z.enum(["true", "false"]).optional(),
        category: z.string().max(100).optional(),
      })
      .parse(c.req.query());
    const rows = await store.db.query.records.findMany({
      where: (table, { and, eq, gt }) =>
        and(
          eq(table.kind, "notification"),
          eq(table.owner, accountId(c)),
          cursor ? gt(table.id, cursor) : undefined,
          unreadOnly === "true" ? sql`${table.payload}->>'readAt' IS NULL` : undefined,
          category ? sql`${table.payload}->>'category' = ${category}` : undefined,
        ),
      orderBy: (table, { asc }) => asc(table.id),
      limit: limit + 1,
    });
    return ok(c, {
      items: rows.slice(0, limit).map(present),
      nextCursor: rows.length > limit ? (rows[limit - 1]?.id ?? null) : null,
    });
  });
  return app;
};
