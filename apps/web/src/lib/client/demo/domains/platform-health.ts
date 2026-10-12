import type { ClientOutput } from "@spoke/protocol";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso } from "../../../../demo/world/ids";
import { DEMO_CHAIN_ID, DEMO_PROTOCOL_ADDRESS, blockAt } from "../views/basics";

export const INDEXER_LAG_BLOCKS = 14n;
export const SECONDS_PER_BLOCK = 1;

const watermark = (now: number) => {
  const head = BigInt(blockAt(now));
  const indexed = head > INDEXER_LAG_BLOCKS ? head - INDEXER_LAG_BLOCKS : 0n;
  return {
    head: head.toString(),
    indexed: indexed.toString(),
    lagSeconds: Number(head - indexed) * SECONDS_PER_BLOCK,
  };
};

export const demoHealth = (runtime: DemoRuntime): ClientOutput<"system.health"> => {
  const mark = watermark(runtime.now());
  return {
    api: "ok",
    database: "ok",
    rpc: "ok",
    indexer: { status: "degraded", lastBlock: mark.indexed, lagSeconds: mark.lagSeconds },
    chainHead: mark.head,
    chainId: DEMO_CHAIN_ID,
    protocolAddress: DEMO_PROTOCOL_ADDRESS,
  };
};

export const latestRun = (runtime: DemoRuntime) => runtime.world.reconciliations.at(-1) ?? null;

export const demoStatus = (runtime: DemoRuntime): ClientOutput<"system.status"> => {
  const now = runtime.now();
  const mark = watermark(now);
  return {
    indexer: {
      name: "Sample indexer",
      indexedBlock: mark.indexed,
      chainHead: mark.head,
      chainTime: iso(now),
      lagBlocks: (BigInt(mark.head) - BigInt(mark.indexed)).toString(),
      lagSeconds: mark.lagSeconds,
      state: "behind",
    },
    reconciliation: latestRun(runtime),
    incidents: [...runtime.world.incidents].reverse(),
    maintenanceWindow: null,
  };
};
