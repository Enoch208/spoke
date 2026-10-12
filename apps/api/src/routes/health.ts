import type { Health, SubsystemHealth } from "@spoke/protocol";
import { Hono } from "hono";
import type { AppVariables } from "../http/request-id.js";
import { ok } from "../http/respond.js";

export interface HealthProbes {
  rpc: () => Promise<SubsystemHealth>;
  database?: () => Promise<SubsystemHealth>;
  indexer?: () => Promise<SubsystemHealth>;
  chainHead?: () => Promise<string | null>;
  indexed?: () => Promise<{ lastBlock: string | null; lagSeconds: number | null }>;
}

export interface HealthConfig {
  chainId: number;
  protocolAddress: string | null;
}

export const healthRoutes = (probes: HealthProbes, config: HealthConfig) =>
  new Hono<{ Variables: AppVariables }>().get("/", async (c) => {
    const health: Health = {
      api: "ok",
      database: probes.database ? await probes.database() : "not_configured",
      rpc: await probes.rpc(),
      indexer: {
        status: probes.indexer ? await probes.indexer() : "not_configured",
        ...(probes.indexed ? await probes.indexed() : { lastBlock: null, lagSeconds: null }),
      },
      chainHead: probes.chainHead ? await probes.chainHead() : null,
      chainId: config.chainId,
      protocolAddress: config.protocolAddress,
    };
    return ok(c, health);
  });
