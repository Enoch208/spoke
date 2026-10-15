import { clientMethodSchemas, visibilityInput, walletAddress } from "@spoke/protocol";
import { ApiProblem } from "../http/problem.js";
import { input, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { emptyInsights, type InsightsService } from "../services/insights.js";
import type { Services } from "../types.js";

export const insightsRoutes = (services: Services, insights?: InsightsService) => {
  const app = router();
  route(app, services, "GET", "/merchant/distributors/:address/insights", "merchant", async (c) => {
    const address = walletAddress.parse(c.req.param("address"));
    if (c.get("session").address.toLowerCase() !== address.toLowerCase()) {
      const owner = await services.store.identity("wallet", address.toLowerCase());
      const account = owner ? await services.store.get("account", owner) : null;
      if (
        owner &&
        visibilityInput.parse(account?.payload.visibility ?? { level: "private" }).level !==
          "public"
      )
        throw new ApiProblem(404, "NOT_FOUND", "No public wallet context is available.");
    }
    return ok(c, insights ? await insights.read(address) : emptyInsights());
  });
  route(
    app,
    services,
    "POST",
    "/merchant/distributors/:address/insights",
    "merchant",
    async (c) => {
      await input(
        c,
        clientMethodSchemas["insights.research"].input.omit({ address: true }).strict(),
      );
      const address = walletAddress.parse(c.req.param("address"));
      const owner = await services.store.identity("wallet", address.toLowerCase());
      const account = owner ? await services.store.get("account", owner) : null;
      if (
        owner &&
        c.get("session").accountId !== owner &&
        visibilityInput.parse(account?.payload.visibility ?? { level: "private" }).level !==
          "public"
      )
        throw new ApiProblem(404, "NOT_FOUND", "No public wallet context is available.");
      await services.store.rate(`partner-research:${c.get("session").accountId}`, 6, 60);
      return ok(
        c,
        insights
          ? await insights.research(address, c.get("session").accountId)
          : { status: "not_configured", insights: emptyInsights() },
      );
    },
  );
  return app;
};
