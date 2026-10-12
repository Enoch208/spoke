import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { publicActor, saleReceipt, txRef, uintString, walletAddress } from "@spoke/protocol";
import { events } from "../db/schema.js";
import type { Store, StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { nativeToken } from "./catalog.js";
import type { Services } from "../types.js";

export type ChainEvent = typeof events.$inferSelect;
export const eventTx = (chainId: number, event: ChainEvent) =>
  txRef.parse({
    hash: event.txHash,
    blockNumber: event.blockNumber,
    at: event.at.toISOString(),
    explorerUrl: chainId === 10143 ? `https://testnet.monadvision.com/tx/${event.txHash}` : null,
  });

export const actorView = async (store: Store, address: string, includePrivate = false) => {
  const owner = await store.identity("wallet", address.toLowerCase());
  const account = owner ? await store.get("account", owner) : undefined;
  const visibility =
    z
      .object({ level: z.enum(["public", "pseudonymous", "private"]) })
      .optional()
      .parse(account?.payload.visibility)?.level ?? "private";
  return publicActor.parse({
    address: includePrivate || visibility === "public" ? address : null,
    handle: visibility === "private" ? null : (account?.payload.handle ?? null),
    displayName:
      visibility === "public"
        ? (account?.payload.displayName ?? null)
        : visibility === "private"
          ? "Someone"
          : null,
    visibility,
  });
};

export const receiptEvidence = (store: Store, chainId: number, saleId: string) =>
  store.db
    .select()
    .from(events)
    .where(and(eq(events.chainId, chainId), sql`${events.payload}->>'saleId' = ${saleId}`))
    .orderBy(asc(sql`${events.blockNumber}::numeric`), asc(events.logIndex));

export const receiptView = async (
  { store, chain }: Services,
  row: StoredRecord,
  revealBuyer = false,
) => {
  const proofs = await receiptEvidence(store, chain.chainId, row.id);
  const purchase = proofs.find((event) => event.name === "NativePurchaseAccepted");
  if (!purchase)
    throw new ApiProblem(
      503,
      "INDEXER_LAGGING",
      "Purchase evidence has not been indexed yet.",
      true,
    );
  const finalized = proofs.find((event) => event.name === "SaleFinalized");
  const refunded = proofs.find((event) => event.name === "SaleRefunded");
  if ((row.payload.status === 3 && !finalized) || (row.payload.status === 2 && !refunded))
    throw new ApiProblem(
      503,
      "INDEXER_LAGGING",
      "The sale outcome evidence is still being indexed.",
      true,
    );
  const state = ["NONE", "PENDING", "REFUNDED", "FINALIZED"][
    z.number().int().parse(row.payload.status)
  ];
  const raw = z
    .array(
      z.object({
        recipient: walletAddress,
        amount: uintString,
        depth: z.number().int(),
        effectiveWeightBps: z.number().int(),
      }),
    )
    .parse(row.payload.allocations);
  const claims = z.array(z.boolean()).parse(row.payload.allocationClaims ?? []);
  const campaignId = uintString.parse(row.payload.campaignId);
  const saleAllocations = await Promise.all(
    raw.map(async (allocation, index) => {
      const claimed = state === "FINALIZED" && claims[index] === true;
      let claimTx = null;
      if (claimed && finalized) {
        const [claim] = await store.db
          .select()
          .from(events)
          .where(
            and(
              eq(events.chainId, chain.chainId),
              eq(events.name, "RewardClaimed"),
              sql`${events.payload}->>'campaignId' = ${campaignId}`,
              sql`lower(${events.payload}->>'recipient') = ${allocation.recipient.toLowerCase()}`,
              sql`(${events.blockNumber}::numeric > ${finalized.blockNumber}::numeric OR (${events.blockNumber} = ${finalized.blockNumber} AND ${events.logIndex} > ${finalized.logIndex}))`,
            ),
          )
          .orderBy(asc(sql`${events.blockNumber}::numeric`), asc(events.logIndex))
          .limit(1);
        if (claim) claimTx = eventTx(chain.chainId, claim);
      }
      return {
        recipient: await actorView(store, allocation.recipient),
        level: allocation.depth + 1,
        effectiveWeightBps: allocation.effectiveWeightBps,
        amount: allocation.amount,
        state:
          state === "REFUNDED"
            ? "refunded"
            : state === "FINALIZED"
              ? claimed
                ? "claimed"
                : "claimable"
              : "reserved",
        claimTx,
      };
    }),
  );
  let proceedsClaimed = false;
  if (finalized) {
    const [claim] = await store.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.chainId, chain.chainId),
          eq(events.name, "MerchantProceedsClaimed"),
          sql`${events.payload}->>'campaignId' = ${campaignId}`,
          sql`(${events.blockNumber}::numeric > ${finalized.blockNumber}::numeric OR (${events.blockNumber} = ${finalized.blockNumber} AND ${events.logIndex} > ${finalized.logIndex}))`,
        ),
      )
      .limit(1);
    proceedsClaimed = claim !== undefined;
  }
  const dispute = await store.get("dispute", row.id);
  return saleReceipt.parse({
    ...row.payload,
    saleId: row.id,
    chainId: chain.chainId,
    contractAddress: chain.address,
    buyer: revealBuyer ? row.payload.buyer : null,
    source: "native",
    trustMode: "NATIVE_ONCHAIN",
    token: nativeToken(chain.token),
    state,
    allocations: saleAllocations,
    purchasedAt: new Date(Number(row.payload.purchasedAt) * 1000).toISOString(),
    unlockAt: new Date(Number(row.payload.unlockAt) * 1000).toISOString(),
    proceedsState:
      state === "REFUNDED"
        ? "refunded"
        : state === "FINALIZED"
          ? proceedsClaimed
            ? "claimed"
            : "claimable"
          : "pending",
    purchaseTx: eventTx(chain.chainId, purchase),
    finalizeTx: finalized ? eventTx(chain.chainId, finalized) : null,
    refundTx: refunded ? eventTx(chain.chainId, refunded) : null,
    timeline: proofs
      .filter((event) =>
        ["NativePurchaseAccepted", "SaleFinalized", "SaleRefunded"].includes(event.name),
      )
      .map((event) => ({
        state:
          event.name === "NativePurchaseAccepted"
            ? "PENDING"
            : event.name === "SaleFinalized"
              ? "FINALIZED"
              : "REFUNDED",
        at: event.at.toISOString(),
        tx: eventTx(chain.chainId, event),
      })),
    refundRequest:
      revealBuyer && dispute
        ? {
            disputeId: dispute.id,
            status: dispute.payload.status,
            createdAt: dispute.createdAt.toISOString(),
          }
        : null,
  });
};
