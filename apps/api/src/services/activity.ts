import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { events, records } from "../db/schema.js";
import type { Services } from "../types.js";

const cursorSchema = z.object({ at: z.iso.datetime(), hash: z.string() });
export const activityFor = async (
  services: Services,
  address: string,
  owner: string,
  raw: Record<string, string>,
) => {
  const query = z
    .object({
      cursor: z.string().max(1024).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      filter: z.string().max(100).optional(),
    })
    .parse(raw);
  const cursor = query.cursor
    ? cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString()))
    : null;
  const rows = await services.store.db
    .select()
    .from(events)
    .where(
      and(
        eq(events.chainId, services.chain.chainId),
        sql`EXISTS (SELECT 1 FROM jsonb_each_text(${events.payload}) item WHERE lower(item.value) = ${address.toLowerCase()})`,
        query.filter ? eq(events.name, query.filter) : undefined,
        cursor
          ? sql`(${events.at}, ${events.id}) < (${cursor.at}::timestamptz, ${cursor.hash})`
          : undefined,
      ),
    )
    .orderBy(desc(events.at), desc(events.id))
    .limit(query.limit + 1);
  const gas = await services.store.db
    .select()
    .from(records)
    .where(
      and(
        eq(records.kind, "gas-history"),
        eq(records.owner, owner),
        sql`lower(${records.payload}->>'address') = ${address.toLowerCase()}`,
      ),
    );
  const token = (await services.chain.tokenInfo())[0] ?? null;
  const combined = [
    ...rows.map((row) => ({
      id: row.id,
      kind: row.name,
      amount: row.payload.amount ?? row.payload.price ?? row.payload.value ?? null,
      token,
      txHash: row.txHash,
      blockNumber: row.blockNumber,
      status: "done",
      objectId: z
        .string()
        .parse(row.payload.saleId ?? row.payload.nodeId ?? row.payload.campaignId ?? "account"),
      at: row.at.toISOString(),
    })),
    ...gas
      .filter(() => !query.filter || query.filter === "gasReceived")
      .map((row) => ({
        id: row.id,
        kind: "gasReceived",
        amount: row.payload.amount,
        token: null,
        txHash: row.payload.txHash,
        blockNumber: row.payload.blockNumber,
        status: row.payload.state === "received" ? "done" : "reverted",
        objectId: "account",
        at: String(row.payload.receivedAt),
      })),
  ]
    .filter(
      (row) => !cursor || row.at < cursor.at || (row.at === cursor.at && row.id < cursor.hash),
    )
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
  const last = combined[query.limit - 1];
  return {
    items: combined.slice(0, query.limit),
    nextCursor:
      combined.length > query.limit && last
        ? Buffer.from(JSON.stringify({ at: last.at, hash: last.id })).toString("base64url")
        : null,
  };
};
