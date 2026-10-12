import type { SubsystemHealth } from "@spoke/protocol";
import type { Store } from "../db/store.js";

export const createIndexerHealthProbes = (
  store: Pick<Store, "get">,
  protocolAddress: string | null,
) => {
  const snapshot = async () => {
    if (!protocolAddress)
      return { status: "not_configured" as const, lastBlock: null, lagSeconds: null };
    const row = await store.get("indexer", "cursor");
    const indexedBlockAt =
      typeof row?.payload.indexedBlockAt === "string"
        ? Date.parse(row.payload.indexedBlockAt)
        : NaN;
    const lagSeconds = Number.isFinite(indexedBlockAt)
      ? Math.max(0, (Date.now() - indexedBlockAt) / 1000)
      : null;
    const status: SubsystemHealth =
      row?.payload.status === "live" && lagSeconds !== null && lagSeconds <= 15 ? "ok" : "degraded";
    return {
      status,
      lastBlock: typeof row?.payload.blockNumber === "string" ? row.payload.blockNumber : null,
      lagSeconds,
    };
  };
  return {
    indexer: async () => (await snapshot()).status,
    indexed: async () => {
      const { lastBlock, lagSeconds } = await snapshot();
      return { lastBlock, lagSeconds };
    },
  };
};
