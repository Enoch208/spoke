import type { ClientOutput, SubsystemHealth } from "@spoke/protocol";

export type Overall = "working" | "degraded" | "outage" | "notDeployed" | "apiDown" | "checking";

type Health = ClientOutput<"system.health">;
type Status = ClientOutput<"system.status">;

export const behindSeconds = 30;

export const indexerHealth = (health: Health, status: Status | undefined): SubsystemHealth => {
  if (health.indexer.status !== "ok") return health.indexer.status;
  const lag = status?.indexer.lagSeconds ?? health.indexer.lagSeconds ?? 0;
  return lag > behindSeconds ? "degraded" : "ok";
};

export const overallState = ({
  health,
  status,
  healthFailed,
}: {
  health: Health | undefined;
  status: Status | undefined;
  healthFailed: boolean;
}): Overall => {
  if (healthFailed) return "apiDown";
  if (!health) return "checking";
  if (!health.protocolAddress) return "notDeployed";
  const parts: SubsystemHealth[] = [
    health.api,
    health.database,
    health.rpc,
    indexerHealth(health, status),
  ];
  if (parts.includes("down")) return "outage";
  if (parts.includes("degraded")) return "degraded";
  return "working";
};
