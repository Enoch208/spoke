import { clientMethodSchemas } from "@spoke/protocol";
import { boundedText } from "../http/bounded.js";
import { input, route, routeRegistry, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";

export const playgroundRoutes = (
  services: Services,
  run: (request: Request) => Promise<Response>,
) => {
  const app = router();
  route(app, services, "POST", "/playground", "public", async (c) => {
    await services.store.rate(`playground:${c.get("ip")}`, 10, 60);
    const { path } = await input(c, clientMethodSchemas["playground.run"].input.strict());
    if (!path.startsWith("/v1/") || /[\\#\s]|%2f|%5c|%2e/i.test(path))
      throw new ApiProblem(400, "VALIDATION_FAILED", "Choose a public API GET path.");
    const base = "http://spoke.internal";
    const url = new URL(path, base);
    if (
      url.origin !== base ||
      !routeRegistry.some(
        (entry) =>
          entry.auth === "public" &&
          entry.method === "GET" &&
          new RegExp(`^${entry.path.replace(/:[^/]+/g, "[^/]+")}$`).test(url.pathname),
      )
    )
      throw new ApiProblem(403, "NOT_AUTHORIZED", "This route is not available in the playground.");
    const start = performance.now();
    const response = await run(
      new Request(url, {
        headers: {
          "x-forwarded-for": c.req.header("x-forwarded-for") ?? "playground",
          origin: services.webOrigin,
        },
      }),
    );
    const body = await boundedText(response, 1_000_000);
    return ok(c, {
      status: response.status,
      headers: Object.fromEntries(
        ["content-type", "x-request-id", "cache-control"].flatMap((name) =>
          response.headers.has(name) ? [[name, response.headers.get(name) ?? ""]] : [],
        ),
      ),
      body,
      durationMs: performance.now() - start,
      size: Buffer.byteLength(body),
    });
  });
  return app;
};
