import { z } from "zod";
import { spokeProtocolAbi, reconciliation, rewardLedger, proceedsLedger } from "@spoke/protocol";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";

const rewardZero = () =>
  rewardLedger.parse({
    netDeposited: "0",
    available: "0",
    pendingReserved: "0",
    vestedUnclaimed: "0",
    rewardsClaimed: "0",
    surplusWithdrawn: "0",
  });
const proceedsZero = () =>
  proceedsLedger.parse({
    proceedsPending: "0",
    proceedsClaimable: "0",
    proceedsClaimed: "0",
    buyerRefunded: "0",
  });
const sum = <T extends Record<string, string>>(total: T, value: T) => {
  for (const key of Object.keys(total) as (keyof T)[])
    total[key] = (BigInt(total[key] ?? "0") + BigInt(value[key] ?? "0")).toString() as T[keyof T];
};
const stringValues = (value: Record<string, bigint>) =>
  Object.fromEntries(Object.entries(value).map(([key, amount]) => [key, amount.toString()]));
export const runReconciliation = async (services: Services) =>
  services.store.exclusive("spoke-indexer", () =>
    services.store.exclusive("reconciliation", async () => {
      const cursor = await services.store.require("indexer", "cursor");
      const blockNumber = BigInt(z.string().parse(cursor.payload.blockNumber));
      const hash = z.string().parse(cursor.payload.blockHash);
      const contract = await services.chain.ready();
      const count = await services.chain.client.readContract({
        address: contract,
        abi: spokeProtocolAbi,
        functionName: "totalCampaigns",
        blockNumber,
      });
      const rewardIndex = rewardZero();
      const rewardChain = rewardZero();
      const proceedsIndex = proceedsZero();
      const proceedsChain = proceedsZero();
      const mismatches: z.infer<typeof reconciliation>["mismatches"] = [];
      for (let id = 1n; id <= count; id++) {
        const row = await services.store.get("campaign", id.toString());
        const fresh = await services.chain.campaign(id.toString(), blockNumber);
        const indexedReward = row ? rewardLedger.parse(row.payload.rewardLedger) : rewardZero();
        const indexedProceeds = row
          ? proceedsLedger.parse(row.payload.proceedsLedger)
          : proceedsZero();
        const canonicalReward = rewardLedger.parse(stringValues(fresh.rewards));
        const canonicalProceeds = proceedsLedger.parse(stringValues(fresh.proceeds));
        for (const [indexed, canonical] of [
          [indexedReward, canonicalReward],
          [indexedProceeds, canonicalProceeds],
        ] as const) {
          const fields = z.record(z.string(), z.string()).parse(indexed);
          for (const [field, value] of Object.entries(canonical))
            if (fields[field] !== value)
              mismatches.push({
                campaignId: id.toString(),
                field,
                indexed: fields[field] ?? "0",
                canonical: value,
              });
        }
        sum(rewardIndex, indexedReward);
        sum(rewardChain, canonicalReward);
        sum(proceedsIndex, indexedProceeds);
        sum(proceedsChain, canonicalProceeds);
      }
      const [latest, block] = await Promise.all([
        services.store.get("indexer", "cursor"),
        services.chain.client.getBlock({ blockNumber }),
      ]);
      if (
        latest?.payload.blockNumber !== cursor.payload.blockNumber ||
        latest?.payload.blockHash !== hash ||
        block.hash !== hash
      )
        throw new ApiProblem(
          409,
          "INDEXER_LAGGING",
          "The index changed during reconciliation. Retry at a stable checkpoint.",
          true,
        );
      const result = reconciliation.parse({
        matches: mismatches.length === 0,
        blockNumber: blockNumber.toString(),
        rewardIndex,
        rewardChain,
        proceedsIndex,
        proceedsChain,
        mismatches,
      });
      await services.store.put("reconciliation", "latest", "system", result);
      return result;
    }),
  );
