import { walletAddress } from "@spoke/protocol";
import { route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { emptyInsights, type InsightsService } from "../services/insights.js";
import type { Services } from "../types.js";

export const insightsRoutes = (services: Services, insights?: InsightsService) => {
  const app = router();
  route(app, services, "GET", "/merchant/distributors/:address/insights", "merchant", async (c) => {
    const address = walletAddress.parse(c.req.param("address"));
    return ok(c, insights ? await insights.read(address) : emptyInsights());
  });
  return app;
};
