import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId, type AppVariables } from "./http/request-id.js";
import { fail } from "./http/respond.js";
import { healthRoutes, type HealthConfig, type HealthProbes } from "./routes/health.js";

export interface AppDeps {
  webOrigin: string;
  probes: HealthProbes;
  config: HealthConfig;
}

export const createApp = (deps: AppDeps) =>
  new Hono<{ Variables: AppVariables }>()
    .use(requestId)
    .use("/v1/*", cors({ origin: deps.webOrigin, credentials: true }))
    .route("/v1/health", healthRoutes(deps.probes, deps.config))
    .notFound((c) => fail(c, 404, "NOT_FOUND", "No such route."))
    .onError((error, c) => {
      process.stderr.write(`${c.get("requestId")} ${error.stack ?? error.message}\n`);
      return fail(c, 500, "INTERNAL", "Something went wrong on our side.", true);
    });
