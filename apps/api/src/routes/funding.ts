import { randomBytes } from "node:crypto";
import { getCookie, setCookie } from "hono/cookie";
import { walletAddress } from "@spoke/protocol";
import { accountId, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { gasStatus, requestGas } from "../services/gas.js";
import type { Services } from "../types.js";

export const fundingRoutes = (services: Services) => {
  const app = router();
  route(app, services, "GET", "/funding/status", "session", async (c) => {
    const address = walletAddress.parse(c.req.query("address") ?? c.get("session").address);
    if ((await services.store.identity("wallet", address.toLowerCase())) !== accountId(c))
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Wallet is not linked to this account.");
    return ok(c, await gasStatus(services, accountId(c), address));
  });
  route(app, services, "POST", "/funding/gas", "session", async (c) => {
    await services.store.rate(`gas:${accountId(c)}`, 5, 60);
    const cookieName = services.production ? "__Host-spoke_device" : "spoke_device";
    const saved = getCookie(c, cookieName);
    const device = saved && /^[\da-f]{64}$/.test(saved) ? saved : randomBytes(32).toString("hex");
    setCookie(c, cookieName, device, {
      httpOnly: true,
      secure: services.production,
      sameSite: "Lax",
      path: "/",
      maxAge: 31536000,
    });
    return ok(
      c,
      await requestGas(services, accountId(c), c.get("session").address, device, c.get("ip")),
    );
  });
  return app;
};
