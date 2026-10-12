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
    const subsystem = (probe: (() => Promise<SubsystemHealth>) | undefined) =>
      probe ? probe().catch(() => "down" as const) : Promise.resolve("not_configured" as const);
    const [database, rpc, indexer, indexed, chainHead] = await Promise.all([
      subsystem(probes.database),
      subsystem(probes.rpc),
      subsystem(probes.indexer),
      probes.indexed
        ? probes.indexed().catch(() => ({ lastBlock: null, lagSeconds: null }))
        : Promise.resolve({ lastBlock: null, lagSeconds: null }),
      probes.chainHead ? probes.chainHead().catch(() => null) : Promise.resolve(null),
    ]);
    const health: Health = {
      api: "ok",
      database,
      rpc,
      indexer: {
        status: indexer,
        ...indexed,
      },
      chainHead,
      chainId: config.chainId,
      protocolAddress: config.protocolAddress,
    };
    return ok(c, health);
  });
