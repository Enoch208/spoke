import { and, asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { invitationInput, clientMethodSchemas, pageQuery } from "@spoke/protocol";
import { records } from "../db/schema.js";
import { newId, present } from "../db/store.js";
import { accountId, input, merchantFor, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { ApiContext, Services } from "../types.js";

export const invitationRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  const list = async (c: ApiContext, sent: boolean) => {
    const query = pageQuery.parse(c.req.query());
    const merchant = sent ? await merchantFor(c, services) : null;
    const rows = await store.db
      .select()
      .from(records)
      .where(
        and(
          eq(records.kind, "invitation"),
          merchant
            ? sql`${records.payload}->>'merchantId' = ${merchant.id}`
            : eq(records.owner, accountId(c)),
          query.cursor ? gt(records.id, query.cursor) : undefined,
        ),
      )
      .orderBy(asc(records.id))
      .limit(query.limit + 1);
    return {
      items: rows.slice(0, query.limit).map((row) => {
        const payload = present(row);
        return row.payload.status === "pending" &&
          Date.parse(String(row.payload.expiresAt)) <= Date.now()
          ? { ...payload, status: "expired" }
          : payload;
      }),
      nextCursor: rows.length > query.limit ? (rows[query.limit - 1]?.id ?? null) : null,
    };
  };
  route(app, services, "GET", "/me/invitations", "session", async (c) =>
    ok(c, await list(c, false)),
  );
  route(app, services, "GET", "/merchant/invitations", "merchant", async (c) =>
    ok(c, await list(c, true)),
  );
  route(app, services, "POST", "/merchant/invitations", "merchant", async (c) => {
    await store.rate(`invite:${accountId(c)}`, 20, 3600);
    const body = await input(c, invitationInput);
    if (
      Date.parse(body.expiresAt) <= Date.now() ||
      Date.parse(body.expiresAt) > Date.now() + 90 * 86_400_000
    )
      throw new ApiProblem(400, "VALIDATION_FAILED", "Invitation expiry must be within 90 days.");
    const merchant = await merchantFor(c, services);
    const fresh = await services.chain.campaign(body.campaignId);
    if (fresh.campaign.merchant.toLowerCase() !== String(merchant.payload.address).toLowerCase())
      throw new ApiProblem(404, "NOT_FOUND", "No such merchant campaign.");
    if (
      fresh.campaign.ended ||
      fresh.campaign.paused ||
      !fresh.campaign.active ||
      fresh.campaign.endsAt * 1000n <= BigInt(Date.now())
    )
      throw new ApiProblem(409, "CAMPAIGN_NOT_ACTIVE", "This campaign cannot accept invitations.");
    const recipient = await store.identity("wallet", body.distributor.toLowerCase());
    const account = recipient ? await store.get("account", recipient) : undefined;
    if (
      !recipient ||
      z.object({ acceptsInvitations: z.boolean() }).safeParse(account?.payload.visibility).data
        ?.acceptsInvitations !== true
    )
      throw new ApiProblem(403, "NOT_ELIGIBLE", "This distributor has not enabled invitations.");
    const id = newId();
    const row = await store.put("invitation", id, recipient, {
      ...body,
      merchantId: merchant.id,
      parentNodeId: null,
      policyHash: fresh.currentPolicy.policyHash,
      status: "pending",
      withdrawnAt: null,
    });
    await store.put("notification", newId(), recipient, {
      kind: "invitation.received",
      category: "invitations",
      title: "Campaign invitation",
      body: body.message,
      href: `/earn/invitations`,
      workspace: "earn",
      readAt: null,
    });
    return ok(c, present(row), 201);
  });
  route(app, services, "POST", "/me/invitations/:id", "session", async (c) => {
    const id = z.uuid().parse(c.req.param("id"));
    const body = await input(
      c,
      clientMethodSchemas["invitations.respond"].input.omit({ id: true }),
    );
    return store.exclusive(`invitation:${id}`, async () => {
      const row = await store.require("invitation", id, accountId(c));
      if (
        row.payload.status !== "pending" ||
        Date.parse(String(row.payload.expiresAt)) <= Date.now()
      )
        throw new ApiProblem(409, "CONFLICT", "Invitation is no longer pending.");
      return ok(
        c,
        present(
          await store.put("invitation", id, row.owner, {
            ...row.payload,
            status: body.response === "accept" ? "accepted" : "declined",
            respondedAt: new Date().toISOString(),
          }),
        ),
      );
    });
  });
  route(app, services, "DELETE", "/merchant/invitations/:id", "merchant", async (c) => {
    const id = z.uuid().parse(c.req.param("id"));
    const merchant = await merchantFor(c, services);
    return store.exclusive(`invitation:${id}`, async () => {
      const row = await store.require("invitation", id);
      if (row.payload.merchantId !== merchant.id)
        throw new ApiProblem(404, "NOT_FOUND", "No such invitation.");
      if (
        row.payload.status !== "pending" ||
        Date.parse(String(row.payload.expiresAt)) <= Date.now()
      )
        throw new ApiProblem(409, "CONFLICT", "Only pending invitations can be withdrawn.");
      return ok(
        c,
        present(
          await store.put("invitation", id, row.owner, {
            ...row.payload,
            status: "withdrawn",
            withdrawnAt: new Date().toISOString(),
          }),
        ),
      );
    });
  });
  return app;
};
