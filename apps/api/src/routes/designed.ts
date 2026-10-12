import { clientMethodSchemas, clientRoutes, type ClientMethod } from "@spoke/protocol";
import { route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";

export const designedRoutes = (services: Services) => {
  const app = router();
  for (const [name, candidate] of Object.entries(clientRoutes)) {
    if (clientMethodSchemas[name as ClientMethod].release !== "demo-only") continue;
    route(app, services, candidate.verb, candidate.path, candidate.auth, () => {
      throw new ApiProblem(409, "FEATURE_NOT_AVAILABLE", "This feature is available in Demo mode.");
    });
  }
  return app;
};
