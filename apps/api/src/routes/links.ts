import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { uintString, resourceId } from "@spoke/protocol";
import { accountId, input, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { records } from "../db/schema.js";
import { viewerSession } from "../services/viewer.js";
import { allRecords, pageValues } from "../services/read-utils.js";
import { linkView, linkStatsView, resolutionView, ensureLink } from "../services/links.js";
import type { Services } from "../types.js";

export const linkRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  const byCode = async (code: string) => {
    const [link] = await store.db
      .select()
      .from(records)
      .where(and(eq(records.kind, "link"), sql`${records.payload}->>'code' = ${code}`))
      .limit(1);
    if (link) return store.require("node", link.id);
    const match = /^(\d+)-(\d+)$/.exec(code);
    if (match && Number(match[1]) === chain.chainId)
      return store.require("node", z.string().parse(match[2]));
    throw new ApiProblem(404, "NOT_FOUND", "No such referral link.");
  };
  route(app, services, "POST", "/links", "session", async (c) => {
    const body = await input(c, z.strictObject({ nodeId: uintString }));
    const node = await store.require("node", body.nodeId);
    if ((await store.identity("wallet", node.owner)) !== accountId(c))
      throw new ApiProblem(403, "NOT_AUTHORIZED", "You must own this onchain referral node.");
    return ok(c, await linkView(services, node), 201);
  });
  route(app, services, "GET", "/me/links", "session", async (c) => {
    const wallets = new Set((await allRecords(store, "wallet", accountId(c))).map((row) => row.id));
    const nodes = (await allRecords(store, "node")).filter((row) => wallets.has(row.owner));
    const page = pageValues(c, nodes, (row) => row.id);
    return ok(c, {
      ...page,
      items: await Promise.all(page.items.map((row) => linkView(services, row))),
    });
  });
  route(app, services, "GET", "/links/:id/stats", "session", async (c) => {
    const node = await store.require("node", uintString.parse(c.req.param("id") ?? ""));
    if ((await store.identity("wallet", node.owner)) !== accountId(c))
      throw new ApiProblem(404, "NOT_FOUND", "No such link.");
    return ok(c, await linkStatsView(services, node));
  });
  route(app, services, "GET", "/links/:id", "public", async (c) => {
    const node = await store.require("node", uintString.parse(c.req.param("id") ?? ""));
    const link = await linkView(services, node);
    const viewer = await viewerSession(c, services);
    const owner = await store.identity("wallet", node.owner);
    return ok(
      c,
      viewer !== null && viewer.accountId === owner
        ? link
        : { ...link, visitsEstimate: null, earned: null },
    );
  });
  route(app, services, "GET", "/referrals/:code", "public", async (c) =>
    ok(
      c,
      await resolutionView(services, await byCode(resourceId.parse(c.req.param("code") ?? ""))),
    ),
  );
  route(app, services, "POST", "/referrals/:code/open", "public", async (c) => {
    await store.rate(`referral-open:${c.get("ip")}`, 30, 60);
    await input(c, z.strictObject({}));
    const node = await byCode(resourceId.parse(c.req.param("code") ?? ""));
    const link = await ensureLink(services, node);
    const viewer = await viewerSession(c, services);
    const owner = await store.identity("wallet", node.owner);
    if (
      (viewer === null || viewer.accountId !== owner) &&
      !/bot|crawler|spider/i.test(c.req.header("user-agent") ?? "")
    )
      await store.db
        .update(records)
        .set({
          payload: sql`jsonb_set(${records.payload}, '{visitsEstimate}', to_jsonb((${records.payload}->>'visitsEstimate')::integer + 1))`,
        })
        .where(and(eq(records.kind, "link"), eq(records.id, link.id)));
    return ok(c, { ok: true });
  });
  return app;
};
