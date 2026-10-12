import type { Context } from "hono";
import type { Store } from "./db/store.js";
import type { sessions } from "./db/schema.js";
import type { ChainService } from "./services/chain.js";
import type { ClientMethod } from "@spoke/protocol";

export type SessionRow = typeof sessions.$inferSelect;
export type Variables = {
  requestId: string;
  session: SessionRow;
  chainId: number;
  contractAddress: string | null;
  blockNumber: string | null;
  indexingStatus: "live" | "syncing" | "behind";
  ip: string;
  clientMethod: ClientMethod | null;
};
export type ApiContext = Context<{ Variables: Variables }>;
export interface Services {
  store: Store;
  chain: ChainService;
  webOrigin: string;
  production: boolean;
  operators: string[];
  apiOrigin?: string;
  storageDirectory?: string;
  gasStationKey?: `0x${string}`;
}
