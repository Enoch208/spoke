import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import type { Hex } from "viem";
import { records } from "../db/schema.js";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";

const storedDrip = z.object({
  txHash: z.string().regex(/^0x[\da-f]{64}$/),
  raw: z.string().regex(/^0x[\da-f]+$/),
  nonce: z.number().int().nonnegative(),
  amount: z.string(),
  address: z.string(),
  createdAt: z.iso.datetime(),
  receivedAt: z.iso.datetime().nullable(),
  state: z.enum(["sending", "received", "failed"]),
});
export const refreshDrip = async (services: Services, owner: string) => {
  const row = await services.store.get("gas-account", owner);
  if (!row) return null;
  const drip = storedDrip.parse(row.payload);
  if (drip.state !== "sending") return drip;
  const receipt = await services.chain.client
    .getTransactionReceipt({ hash: drip.txHash as Hex })
    .catch((error: unknown) => {
      if (error instanceof Error && error.name === "TransactionReceiptNotFoundError") return null;
      throw error;
    });
  if (!receipt) return drip;
  const block = await services.chain.client.getBlock({ blockNumber: receipt.blockNumber });
  const updated = {
    ...drip,
    state: receipt.status === "success" ? ("received" as const) : ("failed" as const),
    receivedAt: new Date(Number(block.timestamp) * 1000).toISOString(),
  };
  await services.store.db
    .update(records)
    .set({ payload: updated, updatedAt: new Date() })
    .where(
      and(
        eq(records.kind, "gas-account"),
        eq(records.id, owner),
        sql`${records.payload}->>'txHash' = ${drip.txHash}`,
      ),
    );
  await services.store.put("gas-history", drip.txHash, owner, {
    ...updated,
    raw: undefined,
    blockNumber: receipt.blockNumber.toString(),
  });
  return updated;
};
export const rebroadcastDrip = async (services: Services, drip: z.infer<typeof storedDrip>) => {
  try {
    const accepted = await services.chain.client.sendRawTransaction({
      serializedTransaction: drip.raw as Hex,
    });
    if (accepted !== drip.txHash) throw new Error("Unexpected gas transaction hash");
  } catch (error) {
    if (
      error instanceof Error &&
      /already known|known transaction|nonce too low/i.test(error.message)
    )
      return;
    throw new ApiProblem(
      503,
      "UPSTREAM_UNAVAILABLE",
      "The existing gas transfer is still being checked.",
      true,
    );
  }
};
export const recoverPendingTransfers = async (services: Services, owner: string) => {
  const pending = await services.store.db
    .select()
    .from(records)
    .where(and(eq(records.kind, "gas-account"), sql`${records.payload}->>'state' = 'sending'`));
  for (const row of pending) {
    if (row.owner === owner) continue;
    const current = await refreshDrip(services, row.owner);
    if (!current || current.state !== "sending") continue;
    await rebroadcastDrip(services, current);
    if ((await refreshDrip(services, row.owner))?.state === "sending")
      throw new ApiProblem(
        409,
        "TX_PENDING",
        "The gas station is confirming an earlier transfer. Try again shortly.",
        true,
      );
  }
};
