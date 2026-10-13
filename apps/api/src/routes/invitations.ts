import { and, asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  invitationInput,
  clientMethodSchemas,
  pageQuery,
  walletAddress,
  invitation,
} from "@spoke/protocol";
import { records } from "../db/schema.js";
import { newId } from "../db/store.js";
import { accountId, input, merchantFor, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import {
  activeInvitationCampaign,
  assertInvitationRecipient,
  invitationTerms,
  invitationView,
  invitationProgress,
} from "../services/invitations.js";
import type { ApiContext, Services } from "../types.js";

export const invitationRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  const list = async (c: ApiContext, sent: boolean) => {
    const query = pageQuery
      .extend({ status: invitation.shape.status.optional(), distributor: walletAddress.optional() })
      .parse(c.req.query());
    const merchant = sent ? await merchantFor(c, services) : null;
    const state = sql`CASE WHEN ${records.payload}->>'status' = 'pending' AND (${records.payload}->>'expiresAt')::timestamptz <= now() THEN 'expired' ELSE ${records.payload}->>'status' END`;
    const rows = await store.db
      .select()
      .from(records)
      .where(
        and(
          eq(records.kind, "invitation"),
          merchant
            ? sql`${records.payload}->>'merchantId' = ${merchant.id}`
            : eq(records.owner, accountId(c)),
          query.status ? sql`${state} = ${query.status}` : undefined,
          sent && query.distributor
            ? sql`lower(${records.payload}->>'distributor') = ${query.distributor.toLowerCase()}`
            : undefined,
          query.cursor ? gt(records.id, query.cursor) : undefined,
        ),
      )
      .orderBy(asc(records.id))
      .limit(query.limit + 1);
    return {
      items: await invitationProgress(services, rows.slice(0, query.limit)),
      nextCursor: rows.length > query.limit ? (rows[query.limit - 1]?.id ?? null) : null,
    };
  };
  route(app, services, "GET", "/me/invitations", "session", async (c) =>
    ok(c, await list(c, false)),
  );
  route(app, services, "GET", "/me/invitations/:id", "session", async (c) =>
    ok(
      c,
      (
        await invitationProgress(services, [
          await store.require("invitation", z.uuid().parse(c.req.param("id")), accountId(c)),
        ])
      )[0],
    ),
  );
  route(app, services, "GET", "/merchant/invitations", "merchant", async (c) =>
    ok(c, await list(c, true)),
  );
  route(app, services, "POST", "/merchant/invitations", "merchant", async (c) => {
    await store.rate(`invite:${accountId(c)}`, 20, 86400);
    const body = await input(c, invitationInput);
    if (
      Date.parse(body.expiresAt) <= Date.now() ||
      Date.parse(body.expiresAt) > Date.now() + 90 * 86400000
    )
      throw new ApiProblem(400, "VALIDATION_FAILED", "Invitation expiry must be within 90 days.");
    const merchant = await merchantFor(c, services);
    return store.exclusive(
      `invite-send:${body.campaignId}:${body.distributor.toLowerCase()}`,
      async () => {
        const fresh = await activeInvitationCampaign(services, body.campaignId);
        if (
          fresh.campaign.merchant.toLowerCase() !== String(merchant.payload.address).toLowerCase()
        )
          throw new ApiProblem(404, "NOT_FOUND", "No such merchant campaign.");
        const recipient = await assertInvitationRecipient(
          services,
          body.distributor,
          body.campaignId,
          accountId(c),
        );
        const [existing] = await store.db
          .select()
          .from(records)
          .where(
            and(
              eq(records.kind, "invitation"),
              sql`${records.payload}->>'campaignId' = ${body.campaignId}`,
              sql`lower(${records.payload}->>'distributor') = ${body.distributor.toLowerCase()}`,
              sql`(${records.payload}->>'status' = 'accepted' OR (${records.payload}->>'status' = 'pending' AND (${records.payload}->>'expiresAt')::timestamptz > now()))`,
            ),
          )
          .limit(1);
        if (existing)
          throw new ApiProblem(
            409,
            "CONFLICT",
            "This distributor already has a pending or accepted invitation to this campaign.",
          );
        const id = newId();
        const terms = await invitationTerms(services, fresh);
        const row = await store.db.transaction(async (tx) => {
          const [saved] = await tx
            .insert(records)
            .values({
              kind: "invitation",
              id,
              owner: recipient,
              payload: {
                ...body,
                terms,
                merchantId: merchant.id,
                parentNodeId: null,
                policyHash: fresh.currentPolicy.policyHash,
                status: "pending",
                withdrawnAt: null,
              },
            })
            .returning();
          if (!saved) throw new Error("Invitation was not saved.");
          await tx.insert(records).values({
            kind: "notification",
            id: newId(),
            owner: recipient,
            payload: {
              kind: "invitation.received",
              category: "invitations",
              title: "Campaign invitation",
              body: body.message,
              href: `/earn/invitations?id=${id}`,
              workspace: "earn",
              readAt: null,
            },
          });
          return saved;
        });
        return ok(c, invitationView(row), 201);
      },
    );
  });
  route(app, services, "POST", "/me/invitations/:id", "session", async (c) => {
    const id = z.uuid().parse(c.req.param("id"));
    const body = await input(
      c,
      clientMethodSchemas["invitations.respond"].input.omit({ id: true }),
    );
    return store.exclusive(`invitation:${id}`, async () => {
      const row = await store.require("invitation", id, accountId(c));
      const current = invitationView(row);
      const status = body.response === "accept" ? "accepted" : "declined";
      if (current.status === status) return ok(c, current);
      if (current.status !== "pending")
        throw new ApiProblem(409, "CONFLICT", "Invitation is no longer pending.");
      if (body.response === "accept") await activeInvitationCampaign(services, current.campaignId);
      const merchant = await store.require("merchant", current.merchantId);
      const saved = await store.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(records)
          .set({
            payload: {
              ...row.payload,
              status,
              reason: body.reason ?? null,
              respondedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(and(eq(records.kind, "invitation"), eq(records.id, id)))
          .returning();
        if (!updated) throw new Error("Invitation response was not saved.");
        await tx.insert(records).values({
          kind: "notification",
          id: newId(),
          owner: merchant.owner,
          payload: {
            kind: `invitation.${status}`,
            category: "invitations",
            title: `Invitation ${status}`,
            body:
              status === "accepted"
                ? "Your invitation was accepted. Joining is complete when the distributor creates their campaign link."
                : "The distributor declined your campaign invitation.",
            href: "/sell/partners?tab=invitations",
            workspace: "sell",
            readAt: null,
          },
        });
        return updated;
      });
      return ok(c, invitationView(saved));
    });
  });
  route(app, services, "DELETE", "/merchant/invitations/:id", "merchant", async (c) => {
    const id = z.uuid().parse(c.req.param("id"));
    const merchant = await merchantFor(c, services);
    return store.exclusive(`invitation:${id}`, async () => {
      const row = await store.require("invitation", id);
      if (row.payload.merchantId !== merchant.id)
        throw new ApiProblem(404, "NOT_FOUND", "No such invitation.");
      if (row.payload.status === "withdrawn") return ok(c, invitationView(row));
      if (invitationView(row).status !== "pending")
        throw new ApiProblem(409, "CONFLICT", "Only pending invitations can be withdrawn.");
      return ok(
        c,
        invitationView(
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
