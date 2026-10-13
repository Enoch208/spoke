import { z } from "zod";
import { uintString, type auroraDeposit } from "@spoke/protocol";
import type { Store } from "../db/store.js";
import type { AuroraConfirmation } from "./aurora-confirmation.js";

const allocation = z.object({ allocations: z.record(z.string(), uintString) });

export const allocateAuroraProof = async (
  store: Store,
  owner: string,
  deposit: z.infer<typeof auroraDeposit>,
  proof: Awaited<ReturnType<AuroraConfirmation>>,
) => {
  if (proof.state !== "verified") return proof;
  if (!proof.txHash || !proof.receivedAmount)
    return { state: "pending", txHash: null, blockNumber: null } as const;
  const row = await store.revise(
    "aurora-payout",
    `${proof.txHash.toLowerCase()}:${deposit.recipient.toLowerCase()}`,
    owner,
    (previous) => {
      const saved = allocation.parse(previous?.payload ?? { allocations: {} });
      const reserved = Object.entries(saved.allocations)
        .filter(([id]) => id !== deposit.id)
        .reduce((sum, [, amount]) => sum + BigInt(amount), 0n);
      const accepted =
        reserved + BigInt(deposit.minAmountOut) <= BigInt(proof.receivedAmount ?? "0");
      return accepted
        ? { allocations: { ...saved.allocations, [deposit.id]: deposit.minAmountOut } }
        : saved;
    },
  );
  return allocation.parse(row.payload).allocations[deposit.id] === deposit.minAmountOut
    ? proof
    : ({ state: "pending", txHash: null, blockNumber: null } as const);
};

export const confirmAuroraDeposit = async (
  store: Store,
  owner: string,
  deposit: z.infer<typeof auroraDeposit>,
  confirm: AuroraConfirmation,
  startIndex = 0,
  budget: AbortSignal = AbortSignal.timeout(8000),
) => {
  let unavailable = false;
  const count = deposit.destinationTxHashes.length;
  let nextCursor = count ? startIndex % count : 0;
  for (let checked = 0; checked < count; checked += 1) {
    if (budget.aborted) {
      unavailable = true;
      break;
    }
    const hash = deposit.destinationTxHashes[nextCursor];
    if (!hash) break;
    nextCursor = (nextCursor + 1) % count;
    const proof = await confirm({ ...deposit, destinationTxHashes: [hash] }, budget);
    unavailable ||= proof.state === "unavailable";
    const allocated = await allocateAuroraProof(store, owner, deposit, proof);
    if (allocated.state === "verified") return { ...allocated, nextCursor };
  }
  return {
    state: unavailable ? "unavailable" : "pending",
    txHash: null,
    blockNumber: null,
    nextCursor,
  } as const;
};
