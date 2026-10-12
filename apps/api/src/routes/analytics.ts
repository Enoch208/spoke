import { z } from "zod";
import { merchantFor, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { allRecords, stringListQuery } from "../services/read-utils.js";
import { analyticsView } from "../services/analytics.js";
import type { ApiContext, Services } from "../types.js";

export const selectedCampaignIds = async (services: Services, c: ApiContext, id?: string) => {
  const merchant = await merchantFor(c, services);
  const owned = (
    await allRecords(
      services.store,
      "campaign",
      z.string().parse(merchant.payload.address).toLowerCase(),
    )
  ).map((row) => row.id);
  const selected = id
    ? [id]
    : c.req.query("campaignIds")
      ? stringListQuery(c.req.query("campaignIds") ?? "")
      : owned;
  if (selected.some((id) => !owned.includes(id)))
    throw new ApiProblem(404, "NOT_FOUND", "No such campaign in your workspace.");
  return new Set(selected);
};
export const analyticsRoutes = (services: Services) => {
  const app = router();
  route(app, services, "GET", "/merchant/analytics", "merchant", async (c) =>
    ok(c, await analyticsView(services, await selectedCampaignIds(services, c), c.req.query())),
  );
  route(app, services, "GET", "/merchant/campaigns/:id/analytics", "merchant", async (c) =>
    ok(
      c,
      await analyticsView(
        services,
        await selectedCampaignIds(services, c, c.req.param("id") ?? ""),
        c.req.query(),
      ),
    ),
  );
  return app;
};
