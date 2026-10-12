import { z } from "zod";
import { walletAddress, visibilityInput } from "@spoke/protocol";
import { route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { allRecords, pageValues, stringListQuery } from "../services/read-utils.js";
import { reputationFacts, reputationView } from "../services/reputation.js";
import { discoveryView } from "../services/discovery.js";
import { viewerSession } from "../services/viewer.js";
import type { Services, ApiContext } from "../types.js";

export const reputationRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  const partnerCampaigns = async (c: ApiContext) => {
    const viewer = await viewerSession(c, services);
    const merchant = viewer ? await store.get("merchant", viewer.accountId) : undefined;
    return new Set(
      merchant
        ? (
            await allRecords(
              store,
              "campaign",
              z.string().parse(merchant.payload.address).toLowerCase(),
            )
          ).map((row) => row.id)
        : [],
    );
  };
  route(app, services, "GET", "/me/reputation", "session", async (c) =>
    ok(c, await reputationView(services, c.get("session").address, true)),
  );
  route(app, services, "GET", "/distributors/:address/profile", "public", async (c) => {
    const value = c.req.param("address") ?? "";
    const parsed = walletAddress.safeParse(value);
    const owner = parsed.success ? null : await store.identity("handle", value);
    const account = owner ? await store.get("account", owner) : null;
    if (!parsed.success && !account) return ok(c, { hidden: true });
    const address = parsed.success ? parsed.data : walletAddress.parse(account?.payload.address);
    return ok(c, await reputationView(services, address));
  });
  route(app, services, "GET", "/distributors/:address", "public", async (c) => {
    const address = walletAddress.parse(c.req.param("address") ?? "");
    const owner = await store.identity("wallet", address.toLowerCase());
    const account = owner ? await store.get("account", owner) : undefined;
    if (
      visibilityInput.parse(account?.payload.visibility ?? { level: "private" }).level === "private"
    )
      throw new ApiProblem(404, "NOT_FOUND", "No public distributor record is available.");
    const facts = await reputationFacts(services, address);
    if (facts.visibility.level === "private")
      throw new ApiProblem(404, "NOT_FOUND", "No public distributor record is available.");
    const ids = await partnerCampaigns(c);
    return ok(c, {
      ...discoveryView(facts).card,
      isPartner: facts.nodes.some((node) => ids.has(z.string().parse(node.payload.campaignId))),
    });
  });
  route(app, services, "GET", "/distributors", "public", async (c) => {
    await store.rate(`discovery:${c.get("ip")}`, 30, 60);
    const query = z
      .object({
        minSettledSales: z.coerce.number().int().nonnegative().default(1),
        merchantDiversity: z.coerce.number().int().nonnegative().default(0),
        recency: z.coerce.number().int().positive().optional(),
        q: z.string().max(200).optional(),
        categories: z.string().optional(),
        sort: z.enum(["balanced", "settled", "diversity", "recent", "new"]).default("balanced"),
      })
      .parse(c.req.query());
    const categories = query.categories ? stringListQuery(query.categories) : [];
    const partnerIds = await partnerCampaigns(c);
    const card = (
      facts: Awaited<ReturnType<typeof reputationFacts>>,
      slot: "ranked" | "new" = "ranked",
    ) => {
      const value = discoveryView(facts, categories, slot);
      return {
        ...value,
        card: {
          ...value.card,
          isPartner: facts.nodes.some((node) =>
            partnerIds.has(z.string().parse(node.payload.campaignId)),
          ),
        },
      };
    };
    const facts = await Promise.all(
      (await allRecords(store, "account"))
        .filter(
          (row) =>
            z.object({ level: z.string() }).parse(row.payload.visibility).level !== "private",
        )
        .map((row) => reputationFacts(services, walletAddress.parse(row.payload.address))),
    );
    const visible = facts.filter(
      (facts) =>
        (!query.q ||
          facts.account?.payload.handle === query.q ||
          (facts.visibility.level === "public" &&
            facts.address.toLowerCase() === query.q.toLowerCase())) &&
        (!query.recency ||
          (facts.lastSettledAt &&
            Date.now() - Date.parse(facts.lastSettledAt) <= query.recency * 86400000)),
    );
    const ranked = visible
      .filter(
        (facts) =>
          ["settledConversions", "merchantCount", "refundAdjustment"].every((field) =>
            facts.visibility.fields.some((chosen) => chosen === field),
          ) &&
          facts.settled.length >= Math.max(1, query.minSettledSales) &&
          facts.merchantCount >= query.merchantDiversity,
      )
      .map((facts) => ({ facts, ...card(facts) }))
      .filter((row) => !categories.length || row.band > 0);
    ranked.sort(
      (a, b) =>
        b.band - a.band ||
        (query.sort === "settled"
          ? b.facts.settled.length - a.facts.settled.length
          : query.sort === "diversity"
            ? b.facts.merchantCount - a.facts.merchantCount
            : query.sort === "recent"
              ? Date.parse(b.facts.lastSettledAt ?? "") - Date.parse(a.facts.lastSettledAt ?? "")
              : b.score - a.score) ||
        Date.parse(b.facts.lastSettledAt ?? "") - Date.parse(a.facts.lastSettledAt ?? "") ||
        a.facts.address.localeCompare(b.facts.address),
    );
    const newFacts = visible.filter((facts) => {
      const first = facts.liveLinks
        .filter((link) => !categories.length || categories.includes(link.category))
        .map((link) => link.createdAt)
        .sort()[0];
      return (
        facts.settled.length <= 2 &&
        first !== undefined &&
        Date.now() - Date.parse(first) < 30 * 86400000
      );
    });
    newFacts.sort((a, b) => a.address.localeCompare(b.address));
    const rotation = newFacts.length ? Math.floor(Date.now() / 86400000) % newFacts.length : 0;
    const newcomers = [...newFacts.slice(rotation), ...newFacts.slice(0, rotation)]
      .slice(0, 4)
      .map((facts) => card(facts, "new").card);
    const page = pageValues(c, ranked, (row) => row.facts.account?.id ?? row.facts.address);
    return ok(c, { ...page, items: page.items.map((row) => row.card), newDistributors: newcomers });
  });
  return app;
};
