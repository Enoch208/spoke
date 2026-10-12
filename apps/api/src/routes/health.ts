import type { Health, SubsystemHealth } from "@spoke/protocol";
import { Hono } from "hono";
import type { AppVariables } from "../http/request-id.js";
import { ok } from "../http/respond.js";

export interface HealthProbes {
  rpc: () => Promise<SubsystemHealth>;
}

export interface HealthConfig {
  chainId: number;
  protocolAddress: string | null;
}

export const healthRoutes = (probes: HealthProbes, config: HealthConfig) =>
  new Hono<{ Variables: AppVariables }>().get("/", async (c) => {
    const health: Health = {
      api: "ok",
      database: "not_configured",
      rpc: await probes.rpc(),
      indexer: "not_configured",
      chainId: config.chainId,
      protocolAddress: config.protocolAddress,
    };
    return ok(c, health);
  });
