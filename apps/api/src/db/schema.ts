import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const records = pgTable(
  "api_records",
  {
    kind: text().notNull(),
    id: text().notNull(),
    owner: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.kind, table.id] }),
    index("records_owner").on(table.kind, table.owner, table.id),
  ],
);

export const identities = pgTable(
  "api_identities",
  {
    namespace: text().notNull(),
    value: text().notNull(),
    owner: text().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.namespace, table.value] }),
    index("identities_owner").on(table.owner),
  ],
);

export const challenges = pgTable("api_challenges", {
  nonce: text().primaryKey(),
  address: text().notNull(),
  message: text().notNull(),
  kind: text().notNull(),
  purpose: text().notNull(),
  action: text(),
  accountId: text(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

export const sessions = pgTable(
  "api_sessions",
  {
    hash: text().primaryKey(),
    id: text().notNull(),
    accountId: text().notNull(),
    address: text().notNull(),
    csrfHash: text().notNull(),
    method: text().notNull(),
    deviceLabel: text().notNull(),
    signedInAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastActiveAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_account").on(table.accountId)],
);

export const confirmations = pgTable("api_confirmations", {
  hash: text().primaryKey(),
  sessionHash: text().notNull(),
  action: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

export const idempotency = pgTable(
  "api_idempotency",
  {
    owner: text().notNull(),
    key: text().notNull(),
    fingerprint: text().notNull(),
    recordId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.owner, table.key] })],
);

export const rateBuckets = pgTable("api_rate_buckets", {
  key: text().primaryKey(),
  count: integer().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

export const events = pgTable(
  "api_chain_events",
  {
    id: text().primaryKey(),
    chainId: integer().notNull(),
    txHash: text().notNull(),
    logIndex: integer().notNull(),
    blockHash: text().notNull(),
    blockNumber: text().notNull(),
    name: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    at: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("chain_event_identity").on(
      table.chainId,
      table.txHash,
      table.logIndex,
      table.blockHash,
    ),
  ],
);
