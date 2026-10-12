import { z } from "zod";
import { uintString } from "@spoke/protocol";
import { accountId, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { ApiProblem } from "../http/problem.js";
import { graphNodeView, sliceView } from "../services/graph.js";
import { viewerSession } from "../services/viewer.js";
import { allRecords, relatedRecords } from "../services/read-utils.js";
import type { Services } from "../types.js";

export const graphRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  route(app, services, "GET", "/campaigns/:id/graph", "public", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    const campaign = await store.require("campaign", id);
    const viewer = await viewerSession(c, services);
    const reveal =
      viewer !== null && (await store.identity("wallet", campaign.owner)) === viewer.accountId;
    const query = z
      .object({
        depth: z.coerce.number().int().min(1).max(16).default(4),
        childLimit: z.coerce.number().int().min(1).max(100).default(25),
        rootNode: uintString.default("0"),
      })
      .parse(c.req.query());
    const rows = await relatedRecords(store, "node", "campaignId", id);
    const selected = [];
    let parents = [query.rootNode];
    if (query.rootNode !== "0") {
      const root = await store.require("node", query.rootNode);
      if (root.payload.campaignId !== id)
        throw new ApiProblem(400, "INVALID_REFERRAL_PATH", "Root belongs to another campaign.");
      selected.push(root);
    }
    for (let depth = 0; depth < query.depth; depth++) {
      const next = parents.flatMap((parent) =>
        rows.filter((row) => row.payload.parentId === parent).slice(0, query.childLimit),
      );
      selected.push(...next);
      parents = next.map((row) => row.id);
    }
    return ok(c, await sliceView(store, selected, selected.length < rows.length, reveal));
  });
  route(app, services, "GET", "/campaigns/:id/graph/search", "public", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    const q = z.string().min(1).max(100).parse(c.req.query("q"));
    await store.require("campaign", id);
    const rows = await relatedRecords(store, "node", "campaignId", id);
    const nodes = await Promise.all(rows.map((row) => graphNodeView(store, row)));
    const sale = await store.get("receipt", q);
    return ok(
      c,
      nodes.filter(
        (node) =>
          node.nodeId === q ||
          node.owner.handle === q ||
          (sale?.payload.campaignId === id && node.nodeId === sale.payload.nodeId),
      ),
    );
  });
  route(app, services, "GET", "/me/graph", "session", async (c) => {
    const wallets = new Set((await allRecords(store, "wallet", accountId(c))).map((row) => row.id));
    const query = z
      .object({
        rootNode: uintString.optional(),
        depth: z.coerce.number().int().min(1).max(16).default(4),
        childLimit: z.coerce.number().int().min(1).max(100).default(25),
      })
      .parse(c.req.query());
    const all = await allRecords(store, "node");
    const own = all.filter((row) => wallets.has(row.owner));
    const ids = new Set(own.map((row) => row.id));
    const roots = query.rootNode
      ? own.filter((row) => row.id === query.rootNode)
      : own.filter((row) => !ids.has(z.string().parse(row.payload.parentId)));
    if (query.rootNode && !roots.length)
      throw new ApiProblem(404, "NOT_FOUND", "No such owned graph root.");
    const selected = new Map(roots.slice(0, query.childLimit).map((row) => [row.id, row]));
    let parents = [...selected.keys()];
    let truncated = roots.length > query.childLimit;
    for (let depth = 0; depth < query.depth; depth++) {
      const next = parents.flatMap((parent) => {
        const children = all.filter((row) => row.payload.parentId === parent);
        if (children.length > query.childLimit) truncated = true;
        return children.slice(0, query.childLimit).filter((row) => !selected.has(row.id));
      });
      for (const row of next) selected.set(row.id, row);
      parents = next.map((row) => row.id);
    }
    if (
      all.some(
        (row) => parents.includes(z.string().parse(row.payload.parentId)) && !selected.has(row.id),
      )
    )
      truncated = true;
    return ok(c, await sliceView(store, [...selected.values()], truncated, wallets));
  });
  return app;
};
