import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { countsByState, pageQuery } from "@spoke/protocol";
import { records } from "../db/schema.js";
import type { Store, StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import type { ApiContext } from "../types.js";

export const allRecords = (store: Store, kind: string, owner?: string) =>
  store.db
    .select()
    .from(records)
    .where(and(eq(records.kind, kind), owner === undefined ? undefined : eq(records.owner, owner)))
    .orderBy(asc(records.id));
export const relatedRecords = (store: Store, kind: string, field: string, value: string) =>
  store.db
    .select()
    .from(records)
    .where(and(eq(records.kind, kind), sql`${records.payload}->>${field} = ${value}`))
    .orderBy(asc(records.id));
export const timestamp = (value: unknown) =>
  new Date(Number(z.string().parse(value)) * 1000).toISOString();
export const counts = (rows: StoredRecord[]) =>
  countsByState.parse({
    pending: rows.filter((row) => row.payload.status === 1).length,
    finalized: rows.filter((row) => row.payload.status === 3).length,
    refunded: rows.filter((row) => row.payload.status === 2).length,
  });
export const pageValues = <T>(c: ApiContext, rows: T[], key: (row: T) => string) => {
  const query = pageQuery.parse(c.req.query());
  const previous =
    query.cursor === undefined ? -1 : rows.findIndex((row) => key(row) === query.cursor);
  if (query.cursor !== undefined && previous === -1)
    throw new ApiProblem(400, "VALIDATION_FAILED", "Cursor does not belong to this result set.");
  const offset = previous + 1;
  const items = rows.slice(offset, offset + query.limit);
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: offset + items.length < rows.length && last !== undefined ? key(last) : null,
  };
};
export const indexedBlock = async (store: Store) =>
  z
    .string()
    .nullable()
    .parse((await store.get("indexer", "cursor"))?.payload.blockNumber ?? null);
export const zeroBuckets = () => ({
  atRisk: "0",
  readyToFinalize: "0",
  claimable: "0",
  claimed: "0",
  refunded: "0",
  reversed: "0",
});
export const jsonQuery = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new ApiProblem(400, "VALIDATION_FAILED", "A query field contains invalid JSON.");
    throw error;
  }
};
export const stringListQuery = (raw: string) =>
  z
    .array(z.string().min(1).max(200))
    .max(128)
    .parse(raw.trim().startsWith("[") ? jsonQuery(raw) : raw ? raw.split(",") : []);
