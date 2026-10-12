import {
  rewardLedger,
  proceedsLedger,
  simulatePolicy,
  vaultLedger,
  commissionPolicy,
} from "@spoke/protocol";
import type { Services } from "../types.js";
import { ApiProblem } from "../http/problem.js";
import { allRecords, indexedBlock, relatedRecords } from "./read-utils.js";
import { nativeToken } from "./catalog.js";
import { policyView, wire } from "./chain.js";

export const totalLedger = <T extends Record<string, string>>(rows: T[], empty: T): T => {
  const result = { ...empty };
  for (const key in result)
    result[key] = rows
      .reduce((sum, row) => sum + BigInt(row[key] ?? "0"), 0n)
      .toString() as T[Extract<keyof T, string>];
  return result;
};
export const rewardZero = () =>
  rewardLedger.parse({
    netDeposited: "0",
    available: "0",
    pendingReserved: "0",
    vestedUnclaimed: "0",
    rewardsClaimed: "0",
    surplusWithdrawn: "0",
  });
export const proceedsZero = () =>
  proceedsLedger.parse({
    proceedsPending: "0",
    proceedsClaimable: "0",
    proceedsClaimed: "0",
    buyerRefunded: "0",
  });
export const vaultSnapshot = async (
  services: Services,
  merchant: string,
  id?: string,
  atBlock?: bigint,
) => {
  const { store, chain } = services;
  const rows = id
    ? [await store.require("campaign", id, merchant.toLowerCase())]
    : await allRecords(store, "campaign", merchant.toLowerCase());
  const head = await chain.client.getBlock(atBlock === undefined ? {} : { blockNumber: atBlock });
  const projected = [];
  for (const row of rows) {
    const fresh = await chain.campaign(row.id, head.number);
    const rewards = rewardLedger.parse(wire(fresh.rewards));
    const proceeds = proceedsLedger.parse(wire(fresh.proceeds));
    if (
      fresh.rewards.netDeposited !==
        fresh.rewards.available +
          fresh.rewards.pendingReserved +
          fresh.rewards.vestedUnclaimed +
          fresh.rewards.rewardsClaimed +
          fresh.rewards.surplusWithdrawn ||
      fresh.proceeds.received !==
        fresh.proceeds.proceedsPending +
          fresh.proceeds.proceedsClaimable +
          fresh.proceeds.proceedsClaimed +
          fresh.proceeds.buyerRefunded
    )
      throw new ApiProblem(
        503,
        "EXPORT_RECONCILIATION_MISMATCH",
        "Canonical vault conservation check failed.",
      );
    const pending = (await relatedRecords(store, "receipt", "campaignId", row.id)).filter(
      (row) => row.payload.status === 1,
    );
    const ready = [];
    for (const receipt of pending) {
      const [sale] = await chain.sale(receipt.id, head.number);
      if (sale.status === 1 && sale.unlockAt <= head.timestamp) ready.push(receipt.id);
    }
    const policy = policyView(fresh.currentPolicy);
    projected.push({
      campaignId: row.id,
      token: nativeToken(chain.token),
      rewards,
      proceeds,
      rewardPerSale: simulatePolicy(
        fresh.campaign.skuPrice,
        commissionPolicy.strip().parse(policy),
        policy.maxRewardedAncestors,
      ).reserved.toString(),
      liabilityCap: policy.campaignLiabilityCap,
      settledSalesReadyToFinalize: ready,
    });
  }
  return vaultLedger.parse({
    campaigns: projected,
    totals: projected.length
      ? [
          {
            token: nativeToken(chain.token),
            rewards: totalLedger(
              projected.map((row) => row.rewards),
              rewardZero(),
            ),
            proceeds: totalLedger(
              projected.map((row) => row.proceeds),
              proceedsZero(),
            ),
          },
        ]
      : [],
    lastIndexedBlock: await indexedBlock(store),
    blockNumber: head.number.toString(),
  });
};
