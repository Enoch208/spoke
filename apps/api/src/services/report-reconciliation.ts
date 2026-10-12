import { z } from "zod";
import { reconciliation, rewardLedger, proceedsLedger, spokeProtocolAbi } from "@spoke/protocol";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";
import { allRecords } from "./read-utils.js";
import { rewardZero, proceedsZero, totalLedger, vaultSnapshot } from "./vault.js";

export const reconciliationView = async (
  services: Services,
  merchant: string,
  ids: Set<string>,
) => {
  const checkpoint = await services.store.require("indexer", "cursor");
  const cursor = z.string().parse(checkpoint.payload.blockNumber);
  const hash = z.string().parse(checkpoint.payload.blockHash);
  const owned = await allRecords(services.store, "campaign", merchant.toLowerCase());
  const index = owned.filter((row) => ids.has(row.id));
  const chain = await vaultSnapshot(services, merchant, undefined, BigInt(cursor));
  const selected = chain.campaigns.filter((row) => ids.has(row.campaignId));
  const rewardIndex = totalLedger(
    index.map((row) => rewardLedger.parse(row.payload.rewardLedger)),
    rewardZero(),
  );
  const proceedsIndex = totalLedger(
    index.map((row) => proceedsLedger.parse(row.payload.proceedsLedger)),
    proceedsZero(),
  );
  const rewardChain = totalLedger(
    selected.map((row) => row.rewards),
    rewardZero(),
  );
  const proceedsChain = totalLedger(
    selected.map((row) => row.proceeds),
    proceedsZero(),
  );
  const mismatches = [];
  const address = await services.chain.ready();
  const count = await services.chain.client.readContract({
    address,
    abi: spokeProtocolAbi,
    functionName: "totalCampaigns",
    blockNumber: BigInt(cursor),
  });
  for (let id = 1n; id <= count; id++) {
    const canonical = await services.chain.client.readContract({
      address,
      abi: spokeProtocolAbi,
      functionName: "getCampaign",
      args: [id],
      blockNumber: BigInt(cursor),
    });
    if (
      canonical.merchant.toLowerCase() === merchant.toLowerCase() &&
      !owned.some((row) => row.id === id.toString())
    )
      mismatches.push({
        campaignId: id.toString(),
        field: "campaignRecord",
        indexed: "0",
        canonical: "1",
      });
  }
  for (const row of index) {
    const canonical = selected.find((item) => item.campaignId === row.id);
    if (!canonical) continue;
    for (const [field, indexed] of Object.entries({
      ...rewardLedger.parse(row.payload.rewardLedger),
      ...proceedsLedger.parse(row.payload.proceedsLedger),
    })) {
      const value =
        z.record(z.string(), z.string()).parse({ ...canonical.rewards, ...canonical.proceeds })[
          field
        ] ?? "0";
      if (indexed !== value)
        mismatches.push({ campaignId: row.id, field, indexed, canonical: value });
    }
  }
  const [latest, block] = await Promise.all([
    services.store.get("indexer", "cursor"),
    services.chain.client.getBlock({ blockNumber: BigInt(cursor) }),
  ]);
  if (
    latest?.payload.blockNumber !== cursor ||
    latest.payload.blockHash !== hash ||
    block.hash !== hash
  )
    throw new ApiProblem(
      409,
      "INDEXER_LAGGING",
      "The index changed during reconciliation. Retry at a stable checkpoint.",
      true,
    );
  return reconciliation.parse({
    matches: mismatches.length === 0,
    blockNumber: chain.blockNumber,
    rewardIndex,
    rewardChain,
    proceedsIndex,
    proceedsChain,
    mismatches,
  });
};
