import { z } from "zod";
import { auroraCreateInput, auroraQuoteInput } from "@spoke/protocol";
import { accountId, input, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { createAuroraService, type AuroraService } from "../services/aurora.js";
import { createAuroraConfirmation } from "../services/aurora-confirmation.js";
import type { Services } from "../types.js";
import { ApiProblem } from "../http/problem.js";

export const auroraRoutes = (services: Services, configured?: AuroraService) => {
  const service =
    configured ??
    createAuroraService(services.store, null, createAuroraConfirmation("https://rpc.monad.xyz"));
  const app = router();
  route(app, services, "GET", "/funding/aurora", "public", async (c) =>
    ok(c, await service.config()),
  );
  route(app, services, "POST", "/funding/aurora/preview", "session", async (c) => {
    if (c.get("session").method !== "wallet")
      throw new ApiProblem(
        403,
        "FEATURE_NOT_AVAILABLE",
        "Connect an external wallet for mainnet funding. Passkey signing currently supports testnet.",
      );
    await services.store.rate(`aurora:quote:${accountId(c)}`, 12, 60);
    const body = await input(c, auroraQuoteInput);
    return ok(c, await service.preview(body, c.get("session").address));
  });
  route(app, services, "POST", "/funding/aurora/deposits", "session", async (c) => {
    if (c.get("session").method !== "wallet")
      throw new ApiProblem(
        403,
        "FEATURE_NOT_AVAILABLE",
        "Connect an external wallet for mainnet funding. Passkey signing currently supports testnet.",
      );
    await services.store.rate(`aurora:create:${accountId(c)}`, 6, 60);
    const body = await input(c, auroraCreateInput);
    return ok(c, await service.create(accountId(c), c.get("session").address, body));
  });
  route(app, services, "GET", "/funding/aurora/deposits/:id", "session", async (c) => {
    await services.store.rate(`aurora:status:${accountId(c)}`, 30, 60);
    return ok(c, await service.status(accountId(c), z.uuid().parse(c.req.param("id"))));
  });
  return app;
};
