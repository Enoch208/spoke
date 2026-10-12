import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { getAddress } from "viem";
import { conversionEarning, spokeProtocolAbi } from "@spoke/protocol";
import type { Services } from "../types.js";
import type { StoredRecord } from "../db/store.js";
import { events } from "../db/schema.js";
import { ApiProblem } from "../http/problem.js";
import { allRecords, indexedBlock, timestamp, zeroBuckets, stringListQuery } from "./read-utils.js";
import { jsonQuery } from "./read-utils.js";
import { allocations, ancestry } from "./views.js";
import { eventTx, receiptEvidence } from "./evidence.js";
import { nativeToken } from "./catalog.js";

export const allocationBucket = (
  row: StoredRecord,
  index: number,
  chainTime: bigint,
): keyof ReturnType<typeof zeroBuckets> =>
  row.payload.status === 2
    ? "refunded"
    : row.payload.status === 1
      ? BigInt(z.string().parse(row.payload.unlockAt)) > chainTime
        ? "atRisk"
        : "readyToFinalize"
      : z.array(z.boolean()).parse(row.payload.allocationClaims ?? [])[index]
        ? "claimed"
        : "claimable";
export const earnedSnapshot = async (services: Services, wallets: string[]) => {
  const { store, chain } = services;
  const checkpoint = await store.get("indexer", "cursor");
  const before = z
    .string()
    .nullable()
    .parse(checkpoint?.payload.blockNumber ?? null);
  const receipts = (await allRecords(store, "receipt")).filter((row) =>
    allocations
      .parse(row.payload.allocations)
      .some((item) => wallets.includes(item.recipient.toLowerCase())),
  );
  const head = await chain.client.getBlock(before ? { blockNumber: BigInt(before) } : {});
  const rows = [];
  for (const receipt of receipts) {
    const split = allocations.parse(receipt.payload.allocations);
    const path = await ancestry(store, z.string().parse(receipt.payload.nodeId));
    const proof = await receiptEvidence(store, chain.chainId, receipt.id);
    const finalized = proof.find((event) => event.name === "SaleFinalized");
    for (const [index, allocation] of split.entries()) {
      if (!wallets.includes(allocation.recipient.toLowerCase())) continue;
      const bucket = allocationBucket(receipt, index, head.timestamp);
      const [claim] = finalized
        ? await store.db
            .select()
            .from(events)
            .where(
              and(
                eq(events.chainId, chain.chainId),
                eq(events.name, "RewardClaimed"),
                sql`${events.payload}->>'campaignId' = ${receipt.payload.campaignId}`,
                sql`lower(${events.payload}->>'recipient') = ${allocation.recipient.toLowerCase()}`,
                sql`(${events.blockNumber}::numeric > ${finalized.blockNumber}::numeric OR (${events.blockNumber} = ${finalized.blockNumber} AND ${events.logIndex} > ${finalized.logIndex}))`,
              ),
            )
            .orderBy(asc(sql`${events.blockNumber}::numeric`), asc(events.logIndex))
            .limit(1)
        : [];
      const value = conversionEarning.parse({
        saleId: receipt.id,
        campaignId: receipt.payload.campaignId,
        level: allocation.depth + 1,
        pathLength: path.rows.length,
        effectiveWeightBps: allocation.effectiveWeightBps,
        amount: allocation.amount,
        state: bucket === "atRisk" || bucket === "readyToFinalize" ? "reserved" : bucket,
        unlockAt: timestamp(receipt.payload.unlockAt),
        finalizedAt: finalized?.at.toISOString() ?? null,
        claimTxHash: bucket === "claimed" ? (claim?.txHash ?? null) : null,
        evidence: proof.map((event) => eventTx(chain.chainId, event)),
      });
      rows.push({
        ...value,
        bucket,
        nodeId: z.string().parse(receipt.payload.nodeId),
        purchasedAt: timestamp(receipt.payload.purchasedAt),
        recipient: allocation.recipient,
      });
    }
  }
  const buckets = zeroBuckets();
  for (const row of rows)
    buckets[row.bucket] = (BigInt(buckets[row.bucket]) + BigInt(row.amount)).toString();
  const ids = [...new Set(rows.map((row) => row.campaignId))];
  const breakdown = [];
  let onchainClaimable = 0n;
  if (chain.address)
    for (const id of ids)
      for (const wallet of wallets) {
        const [amount] = await chain.client.readContract({
          address: chain.address,
          abi: spokeProtocolAbi,
          functionName: "claimableOf",
          args: [BigInt(id), getAddress(wallet)],
          blockNumber: head.number,
        });
        onchainClaimable += amount;
        breakdown.push({ campaignId: id, amount: amount.toString() });
      }
  if (onchainClaimable !== BigInt(buckets.claimable))
    throw new ApiProblem(
      503,
      "INDEXER_LAGGING",
      "Allocation claims do not match the canonical ledger at the indexed block.",
      true,
    );
  const after = await store.get("indexer", "cursor");
  if (
    before !== (await indexedBlock(store)) ||
    after?.payload.blockHash !== checkpoint?.payload.blockHash ||
    (checkpoint?.payload.blockHash !== undefined && head.hash !== checkpoint.payload.blockHash)
  )
    throw new ApiProblem(
      503,
      "INDEXER_LAGGING",
      "The index advanced while reading earnings. Retry the snapshot.",
      true,
    );
  return {
    rows,
    buckets,
    breakdown,
    token: chain.token ? nativeToken(chain.token) : null,
    indexedBlock: before,
    blockNumber: head.number.toString(),
    chainTime: head.timestamp,
  };
};
export type EarnedSnapshot = Awaited<ReturnType<typeof earnedSnapshot>>;
export const filterEarnings = (rows: EarnedSnapshot["rows"], query: Record<string, string>) => {
  const parsed = z
    .object({
      campaignId: z.string().optional(),
      campaignIds: z.string().optional(),
      nodeId: z.string().optional(),
      state: z.enum(["reserved", "claimable", "claimed", "refunded", "reversed"]).optional(),
      holdEnded: z.enum(["true", "false"]).optional(),
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      range: z.string().optional(),
    })
    .parse(query);
  const range = parsed.range
    ? z.object({ from: z.iso.datetime(), to: z.iso.datetime() }).parse(jsonQuery(parsed.range))
    : null;
  const ids = parsed.campaignIds ? new Set(stringListQuery(parsed.campaignIds)) : null;
  return rows.filter(
    (row) =>
      (!parsed.campaignId || row.campaignId === parsed.campaignId) &&
      (!ids || ids.has(row.campaignId)) &&
      (!parsed.nodeId || row.nodeId === parsed.nodeId) &&
      (!parsed.state || row.state === parsed.state) &&
      (parsed.holdEnded === undefined ||
        (parsed.holdEnded === "true" ? row.bucket !== "atRisk" : row.bucket === "atRisk")) &&
      (!(parsed.from ?? range?.from) ||
        row.purchasedAt >= z.string().parse(parsed.from ?? range?.from)) &&
      (!(parsed.to ?? range?.to) || row.purchasedAt <= z.string().parse(parsed.to ?? range?.to)),
  );
};
