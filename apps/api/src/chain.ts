import type { SubsystemHealth } from "@spoke/protocol";
import { createPublicClient, http } from "viem";

export const rpcProbe = (rpcUrl: string, expectedChainId: number) => {
  const client = createPublicClient({ transport: http(rpcUrl, { timeout: 3_000, retryCount: 0 }) });
  return async (): Promise<SubsystemHealth> => {
    try {
      return (await client.getChainId()) === expectedChainId ? "ok" : "degraded";
    } catch {
      return "down";
    }
  };
};
