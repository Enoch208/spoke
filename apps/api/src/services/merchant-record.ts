import { z } from "zod";
import { merchantRecord } from "@spoke/protocol";
import type { Services } from "../types.js";
import type { StoredRecord } from "../db/store.js";
import { allRecords, counts, indexedBlock, timestamp } from "./read-utils.js";
import { receiptEvidence } from "./evidence.js";

export const merchantRecordView = async (services: Services, merchant: StoredRecord) => {
  const campaigns = await allRecords(
    services.store,
    "campaign",
    z.string().parse(merchant.payload.address).toLowerCase(),
  );
  const ids = new Set(campaigns.map((row) => row.id));
  const rows = (await allRecords(services.store, "receipt")).filter((row) =>
    ids.has(z.string().parse(row.payload.campaignId)),
  );
  const sales = counts(rows);
  const times = [];
  for (const row of rows.filter((row) => row.payload.status === 2)) {
    const event = (await receiptEvidence(services.store, services.chain.chainId, row.id)).find(
      (event) => event.name === "SaleRefunded",
    );
    if (event)
      times.push(
        Math.max(
          0,
          Math.floor((event.at.getTime() - Date.parse(timestamp(row.payload.purchasedAt))) / 1000),
        ),
      );
  }
  times.sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  const median = times.length
    ? times.length % 2
      ? (times[middle] ?? null)
      : Math.floor(((times[middle - 1] ?? 0) + (times[middle] ?? 0)) / 2)
    : null;
  const ledger = (field: string) =>
    campaigns
      .reduce(
        (sum, row) =>
          sum +
          BigInt(z.record(z.string(), z.string()).parse(row.payload.rewardLedger)[field] ?? "0"),
        0n,
      )
      .toString();
  return merchantRecord.parse({
    sales,
    refundRateBps:
      sales.refunded + sales.finalized
        ? Math.round((sales.refunded * 10000) / (sales.refunded + sales.finalized))
        : 0,
    medianRefundSeconds: median,
    rewardsDeposited: ledger("netDeposited"),
    rewardsEarned: (
      BigInt(ledger("vestedUnclaimed")) + BigInt(ledger("rewardsClaimed"))
    ).toString(),
    rewardsWithdrawn: ledger("surplusWithdrawn"),
    indexedBlock: await indexedBlock(services.store),
  });
};
