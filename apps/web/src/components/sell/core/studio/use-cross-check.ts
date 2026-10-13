"use client";

import type { CommissionPolicy } from "@spoke/protocol";
import { useCallback } from "react";
import { useSpokeClient } from "@/lib/client/provider";
import { compareSimulations, previewLengths, type CrossCheck } from "./split";

export const useCrossCheck = () => {
  const client = useSpokeClient();
  return useCallback(
    async (priceMinor: bigint, policy: CommissionPolicy): Promise<CrossCheck> => {
      if (!client) return { kind: "unavailable" };
      const pathLengths = previewLengths(policy.weightsBps.length);
      const server = await client
        .call("studio.simulate", { price: priceMinor.toString(), policy, pathLengths })
        .then((result) => ({ ok: true as const, result }))
        .catch(() => ({ ok: false as const }));
      if (!server.ok) return { kind: "unavailable" };
      return compareSimulations(priceMinor, policy, server.result);
    },
    [client],
  );
};
