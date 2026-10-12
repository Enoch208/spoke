import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { activityRow } from "@spoke/protocol";
import { events } from "../db/schema.js";
import type { Store, StoredRecord } from "../db/store.js";
import { nativeToken } from "./catalog.js";

export const nodeActivity = async (store: Store, node: StoredRecord, sales: StoredRecord[]) => {
  const campaign = await store.require("campaign", z.string().parse(node.payload.campaignId));
  const ids = new Set(sales.map((row) => row.id));
  const rows = (
    await store.db
      .select()
      .from(events)
      .where(
        and(
          eq(events.chainId, z.number().parse(campaign.payload.chainId)),
          sql`${events.payload}->>'campaignId' = ${z.string().parse(node.payload.campaignId)}`,
        ),
      )
  )
    .filter(
      (event) =>
        event.payload.nodeId === node.id ||
        (typeof event.payload.saleId === "string" && ids.has(event.payload.saleId)),
    )
    .sort((a, b) =>
      BigInt(a.blockNumber) > BigInt(b.blockNumber)
        ? -1
        : BigInt(a.blockNumber) < BigInt(b.blockNumber)
          ? 1
          : b.logIndex - a.logIndex,
    )
    .slice(0, 10);
  const token = nativeToken(
    z.object({ rewardToken: z.string() }).parse(campaign.payload.policy).rewardToken,
  );
  return rows.map((event) =>
    activityRow.parse({
      kind: event.name,
      amount: event.payload.price ?? event.payload.amount ?? null,
      token: event.payload.price || event.payload.amount ? token : null,
      txHash: event.txHash,
      blockNumber: event.blockNumber,
      status: "done",
      objectId: event.payload.saleId ?? node.id,
      at: event.at.toISOString(),
    }),
  );
};
