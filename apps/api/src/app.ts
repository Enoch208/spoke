import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { BaseError } from "viem";
import { digest } from "./db/store.js";
import { ApiProblem } from "./http/problem.js";
import { routeRegistry } from "./http/router.js";
import { translateChainError } from "./services/chain.js";
import type { Services } from "./types.js";
import { authRoutes } from "./routes/auth.js";
import { accountRoutes } from "./routes/account.js";
import { walletRoutes } from "./routes/wallets.js";
import { passkeyRoutes } from "./routes/passkeys.js";
import { catalogRoutes } from "./routes/catalog.js";
import { campaignRoutes } from "./routes/campaigns.js";
import { checkoutRoutes } from "./routes/checkout.js";
import { receiptRoutes } from "./routes/receipts.js";
import { earningsRoutes } from "./routes/earnings.js";
import { supportRoutes } from "./routes/support.js";
import { opsRoutes } from "./routes/ops.js";
import { systemRoutes } from "./routes/system.js";
import { rpcRoutes } from "./routes/rpc.js";
import { assetRoutes } from "./routes/assets.js";
import { fulfillmentRoutes } from "./routes/fulfillment.js";
import { designedRoutes } from "./routes/designed.js";
import { insightsRoutes } from "./routes/insights.js";
import type { InsightsService } from "./services/insights.js";
import { playgroundRoutes } from "./routes/playground.js";
import { accountDataRoutes } from "./routes/account-data.js";
import { invitationRoutes } from "./routes/invitations.js";
import { fundingRoutes } from "./routes/funding.js";
import { requestId, type AppVariables } from "./http/request-id.js";
import { fail } from "./http/respond.js";
import { healthRoutes, type HealthConfig, type HealthProbes } from "./routes/health.js";

export interface AppDeps {
  webOrigin: string;
  probes: HealthProbes;
  config: HealthConfig;
  services?: Services;
  rpcUrl?: string;
  rpcFetch?: typeof fetch;
  deploymentBlock?: string;
  insights?: InsightsService;
}

export const createApp = (deps: AppDeps) => {
  if (!routeRegistry.some((entry) => entry.path === "/v1/health"))
    routeRegistry.push({ method: "GET", path: "/v1/health", auth: "public", schemaVersion: "3.0" });
  const app = new Hono<{ Variables: AppVariables }>()
    .use(requestId)
    .use(secureHeaders({ crossOriginResourcePolicy: false }))
    .use(async (c, next) => {
      await next();
      c.header(
        "cross-origin-resource-policy",
        /^\/v1\/assets\/[^/]+$/.test(c.req.path) ? "cross-origin" : "same-origin",
      );
    })
    .use(async (c, next) =>
      bodyLimit({
        maxSize: /^\/v1\/merchant\/(products\/[^/]+\/assets|logo)$/.test(c.req.path)
          ? 25_100_000
          : 150_000,
      })(c, next),
    )
    .use("/v1/*", async (c, next) => {
      c.set("chainId", deps.config.chainId);
      c.set("contractAddress", deps.config.protocolAddress);
      c.set("blockNumber", null);
      c.set("indexingStatus", "syncing");
      c.set("clientMethod", null);
      const ip = c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "local";
      c.set("ip", digest(ip));
      c.header("cache-control", "no-store");
      if (deps.services && new URL(c.req.url).pathname !== "/v1/health") {
        await deps.services.store.rate(`global:${c.get("ip")}`, 240, 60);
        const cursor = await deps.services.store.get("indexer", "cursor");
        if (cursor) {
          const indexedBlockAt =
            typeof cursor.payload.indexedBlockAt === "string"
              ? Date.parse(cursor.payload.indexedBlockAt)
              : NaN;
          c.set("blockNumber", z.string().parse(cursor.payload.blockNumber));
          c.set(
            "indexingStatus",
            cursor.payload.status === "syncing"
              ? "syncing"
              : cursor.payload.status === "behind" ||
                  !Number.isFinite(indexedBlockAt) ||
                  Date.now() - indexedBlockAt > 15_000
                ? "behind"
                : cursor.payload.status === "live"
                  ? "live"
                  : "syncing",
          );
        }
      }
      const path = new URL(c.req.url).pathname;
      const publicRoute = routeRegistry.some(
        (entry) =>
          entry.auth === "public" &&
          entry.method ===
            (c.req.method === "OPTIONS"
              ? c.req.header("access-control-request-method")
              : c.req.method) &&
          new RegExp(`^${entry.path.replace(/:[^/]+/g, "[^/]+")}$`).test(path),
      );
      const wildcard =
        publicRoute &&
        c.req.header("origin") !== deps.webOrigin &&
        (c.req.method === "GET" ||
          c.req.header("access-control-request-method") === "GET" ||
          path === "/v1/rpc");
      c.header("access-control-allow-origin", wildcard ? "*" : deps.webOrigin);
      c.header("vary", "Origin");
      if (!wildcard) {
        c.header("access-control-allow-credentials", "true");
        c.header("vary", "Origin");
      }
      c.header("access-control-expose-headers", "X-Request-Id, Retry-After");
      if (c.req.method === "OPTIONS") {
        c.header("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        c.header("access-control-allow-headers", "Content-Type, X-CSRF-Token, Idempotency-Key");
        c.header("access-control-max-age", "600");
        return c.body(null, 204);
      }
      await next();
    })
    .route("/v1/health", healthRoutes(deps.probes, deps.config))
    .notFound((c) => fail(c, 404, "NOT_FOUND", "No such route."))
    .onError((error, c) => {
      if (error instanceof HTTPException)
        return fail(c, error.status, "VALIDATION_FAILED", "Request body is too large or invalid.");
      if (error instanceof z.ZodError)
        return fail(c, 400, "VALIDATION_FAILED", "Request does not match the API schema.", false, {
          issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        });
      if (error instanceof ApiProblem || error instanceof BaseError) {
        const problem = error instanceof ApiProblem ? error : translateChainError(error);
        if (problem.code === "RATE_LIMITED")
          c.header(
            "retry-after",
            String(z.number().parse(problem.details?.retryAfterSeconds ?? 60)),
          );
        return fail(
          c,
          problem.status,
          problem.code,
          problem.message,
          problem.retryable,
          problem.details,
        );
      }
      process.stderr.write(`${c.get("requestId")} ${error.name}\n`);
      return fail(c, 500, "INTERNAL", "Something went wrong on our side.", true);
    });
  if (deps.services) {
    const services = deps.services;
    for (const routes of [
      authRoutes(services),
      accountRoutes(services),
      accountDataRoutes(services),
      walletRoutes(services),
      passkeyRoutes(services),
      assetRoutes(services),
      fulfillmentRoutes(services),
      fundingRoutes(services),
      invitationRoutes(services),
      catalogRoutes(services),
      campaignRoutes(services),
      checkoutRoutes(services),
      receiptRoutes(services),
      earningsRoutes(services),
      supportRoutes(services),
      insightsRoutes(services, deps.insights),
      opsRoutes(services),
      systemRoutes(services, deps.deploymentBlock ?? "0"),
      designedRoutes(services),
    ])
      app.route("/v1", routes);
    app.route(
      "/v1",
      playgroundRoutes(services, async (request) => await app.fetch(request)),
    );
    if (deps.rpcUrl) app.route("/v1", rpcRoutes(services, deps.rpcUrl, deps.rpcFetch));
  }
  return app;
};
