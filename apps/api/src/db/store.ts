import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ApiProblem } from "../http/problem.js";
import * as schema from "./schema.js";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const newId = () => randomUUID();
export type StoredRecord = typeof schema.records.$inferSelect;

export const connectStore = (url: string) => {
  const client = postgres(url, {
    max: 8,
    connect_timeout: 5,
    idle_timeout: 20,
    onnotice: () => undefined,
  });
  const db = drizzle(client, { schema });
  const lockClient = postgres(url, {
    max: 4,
    connect_timeout: 5,
    idle_timeout: 20,
    onnotice: () => undefined,
  });
  const store = {
    db,
    async migrate() {
      const migration = await readFile(
        new URL("../../migrations/001_api.sql", import.meta.url),
        "utf8",
      );
      await client.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(8740001)`;
        await tx.unsafe(migration);
      });
    },
    async health() {
      await db.execute(sql`select 1`);
      return "ok" as const;
    },
    async pruneExpired() {
      await db.transaction(async (tx) => {
        for (const table of [
          schema.challenges,
          schema.sessions,
          schema.confirmations,
          schema.rateBuckets,
        ])
          await tx.delete(table).where(lt(table.expiresAt, new Date()));
        await tx
          .delete(schema.records)
          .where(
            and(
              sql`${schema.records.kind} IN ('access-grant', 'export')`,
              sql`(${schema.records.payload}->>'expiresAt')::timestamptz < now()`,
            ),
          );
      });
    },
    async close() {
      await Promise.all([client.end({ timeout: 5 }), lockClient.end({ timeout: 5 })]);
    },
    async exclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
      const connection = await lockClient.reserve();
      try {
        const [lock] = await connection<{ acquired: boolean }[]>`
          SELECT pg_try_advisory_lock(hashtextextended(${key}, 0)) AS acquired
        `;
        if (!lock?.acquired)
          throw new ApiProblem(409, "TX_PENDING", "This operation is already in progress.", true);
        try {
          return await work();
        } finally {
          await connection`SELECT pg_advisory_unlock(hashtextextended(${key}, 0))`;
        }
      } finally {
        connection.release();
      }
    },
    async get(kind: string, id: string) {
      const [row] = await db
        .select()
        .from(schema.records)
        .where(and(eq(schema.records.kind, kind), eq(schema.records.id, id)))
        .limit(1);
      return row;
    },
    async require(kind: string, id: string, owner?: string) {
      const row = await store.get(kind, id);
      if (!row || (owner !== undefined && row.owner !== owner))
        throw new ApiProblem(404, "NOT_FOUND", "No such resource.");
      return row;
    },
    async list(kind: string, owner?: string, cursor?: string, limit = 25) {
      const rows = await db
        .select()
        .from(schema.records)
        .where(
          and(
            eq(schema.records.kind, kind),
            owner === undefined ? undefined : eq(schema.records.owner, owner),
            cursor === undefined ? undefined : gt(schema.records.id, cursor),
          ),
        )
        .orderBy(asc(schema.records.id))
        .limit(limit + 1);
      return {
        items: rows.slice(0, limit),
        nextCursor: rows.length > limit ? (rows[limit - 1]?.id ?? null) : null,
      };
    },
    async put(kind: string, id: string, owner: string, payload: Record<string, unknown>) {
      const [row] = await db
        .insert(schema.records)
        .values({ kind, id, owner, payload })
        .onConflictDoUpdate({
          target: [schema.records.kind, schema.records.id],
          set: { payload, updatedAt: new Date() },
          setWhere: eq(schema.records.owner, owner),
        })
        .returning();
      if (!row) throw new ApiProblem(409, "CONFLICT", "Resource belongs to a different account.");
      return row;
    },
    async revise(
      kind: string,
      id: string,
      owner: string,
      change: (previous: StoredRecord | undefined) => Record<string, unknown>,
      historyKind?: string,
    ) {
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`${kind}:${id}`}, 0))`,
        );
        const [previous] = await tx
          .select()
          .from(schema.records)
          .where(and(eq(schema.records.kind, kind), eq(schema.records.id, id)));
        if (previous && previous.owner !== owner)
          throw new ApiProblem(404, "NOT_FOUND", "No such resource.");
        const payload = change(previous);
        if (historyKind)
          await tx.insert(schema.records).values({
            kind: historyKind,
            id: `${id}_${String(payload.version)}`,
            owner,
            payload,
          });
        const [row] = await tx
          .insert(schema.records)
          .values({ kind, id, owner, payload })
          .onConflictDoUpdate({
            target: [schema.records.kind, schema.records.id],
            set: { payload, updatedAt: new Date() },
          })
          .returning();
        if (!row) throw new Error("Record revision lost its row.");
        return row;
      });
    },
    async remove(kind: string, id: string, owner: string) {
      return db
        .delete(schema.records)
        .where(
          and(
            eq(schema.records.kind, kind),
            eq(schema.records.id, id),
            eq(schema.records.owner, owner),
          ),
        )
        .returning();
    },
    async identity(namespace: string, value: string) {
      const [row] = await db
        .select()
        .from(schema.identities)
        .where(and(eq(schema.identities.namespace, namespace), eq(schema.identities.value, value)))
        .limit(1);
      return row?.owner;
    },
    async reserve(namespace: string, value: string, owner: string) {
      const [row] = await db
        .insert(schema.identities)
        .values({ namespace, value, owner })
        .onConflictDoNothing()
        .returning();
      if (!row && (await store.identity(namespace, value)) !== owner)
        throw new ApiProblem(
          409,
          namespace === "handle"
            ? "HANDLE_TAKEN"
            : namespace === "slug"
              ? "SLUG_TAKEN"
              : "WALLET_ALREADY_LINKED",
          "This identifier is already in use.",
        );
    },
    async rate(key: string, max: number, windowSeconds: number) {
      const expiresAt = new Date(Date.now() + windowSeconds * 1000);
      const [row] = await db
        .insert(schema.rateBuckets)
        .values({ key, count: 1, expiresAt })
        .onConflictDoUpdate({
          target: schema.rateBuckets.key,
          set: {
            count: sql`CASE WHEN ${schema.rateBuckets.expiresAt} <= now() THEN 1 ELSE ${schema.rateBuckets.count} + 1 END`,
            expiresAt: sql`CASE WHEN ${schema.rateBuckets.expiresAt} <= now() THEN ${expiresAt.toISOString()}::timestamptz ELSE ${schema.rateBuckets.expiresAt} END`,
          },
        })
        .returning();
      if (row && row.count > max)
        throw new ApiProblem(429, "RATE_LIMITED", "Too many requests. Try again shortly.", true, {
          retryAfterSeconds: Math.max(1, Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000)),
        });
    },
    async audit(
      actor: string,
      action: string,
      resource: string,
      details: Record<string, unknown> = {},
    ) {
      const payload = {
        actor,
        role: "owner",
        action,
        resource,
        beforeHash: null,
        afterHash: null,
        details,
        at: new Date().toISOString(),
      };
      await db.insert(schema.records).values({ kind: "audit", id: newId(), owner: actor, payload });
    },
    async createIntent(owner: string, key: string, payload: Record<string, unknown>) {
      const fingerprint = digest(JSON.stringify(payload));
      return db.transaction(async (tx) => {
        const id = newId();
        await tx
          .insert(schema.idempotency)
          .values({ owner, key, fingerprint, recordId: id })
          .onConflictDoNothing();
        const [entry] = await tx
          .select()
          .from(schema.idempotency)
          .where(and(eq(schema.idempotency.owner, owner), eq(schema.idempotency.key, key)));
        if (!entry || entry.fingerprint !== fingerprint)
          throw new ApiProblem(
            409,
            "CONFLICT",
            "Idempotency key was already used with another request.",
          );
        const data = {
          ...payload,
          id: entry.recordId,
          status: "created",
          txHash: null,
          saleId: null,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
        };
        await tx
          .insert(schema.records)
          .values({ kind: "intent", id: entry.recordId, owner, payload: data })
          .onConflictDoNothing();
        const [row] = await tx
          .select()
          .from(schema.records)
          .where(and(eq(schema.records.kind, "intent"), eq(schema.records.id, entry.recordId)));
        if (!row) throw new Error("Intent transaction lost its record.");
        return row.payload;
      });
    },
  };
  return store;
};
export type Store = ReturnType<typeof connectStore>;
export const present = (row: StoredRecord) => ({
  ...row.payload,
  id: row.id,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
