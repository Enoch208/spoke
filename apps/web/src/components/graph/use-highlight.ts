"use client";

import { useClientQuery } from "@/lib/query/use-client";
import { activeChain } from "@/lib/wagmi";
import type { Highlight } from "./canvas-edges";

export function useHighlight(saleId: string | null): Highlight | null {
  const path = useClientQuery(
    "graph.salePath",
    { saleId: saleId ?? "0", chainId: activeChain.id },
    { enabled: saleId !== null },
  );
  const entries = path.data?.nodes;
  const first = entries?.[0];
  if (!saleId || !entries || !first) return null;
  return {
    saleId,
    purchaseNodeId: first.nodeId,
    refunded: entries.some(
      (entry) => entry.state === "refunded" || entry.reasonIfUnpaid === "REFUNDED",
    ),
    path: new Map(
      entries.map((entry, index) => [
        entry.nodeId,
        {
          level: index + 1,
          weightBps: entry.effectiveWeightBps,
          paid: entry.paid || entry.state !== null,
        },
      ]),
    ),
  };
}
