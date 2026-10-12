import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { events, records } from "../db/schema.js";
import { digest, type Store } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import type { ChainService } from "./chain.js";
import { projectBatch } from "./indexing/projections.js";
import { deriveBatch } from "./indexing/derived.js";
import { sourceEvents, sourceHead, type IndexerSource } from "./indexing/source.js";

export const cursorSchema = z.object({
  blockNumber: z.string().regex(/^\d+$/),
  blockHash: z.string().regex(/^0x[\da-fA-F]{64}$/),
  indexedAt: z.iso.datetime(),
  indexedBlockAt: z.iso.datetime(),
  blockTimestamp: z.string().regex(/^\d+$/).optional(),
  source: z.enum(["direct_rpc", "envio"]),
  configFingerprint: z.string(),
  head: z.string(),
  headTimestamp: z.iso.datetime(),
  lagSeconds: z.number().nonnegative(),
  status: z.enum(["syncing", "live", "behind"]),
});
export const projectionKinds = [
  "campaign",
  "policy-version",
  "node",
  "receipt",
  "allocation",
  "claim",
  "vault-movement",
  "campaign-balance-snapshot",
  "participant-campaign-summary",
  "reputation-aggregate",
];
export const createIndexer = (
  store: Store,
  chain: ChainService,
  deploymentBlock: bigint,
  options: { source: IndexerSource; pollIntervalMs?: number } = { source: "direct_rpc" },
) => {
  const configFingerprint = digest(
    `${String(chain.chainId)}:${chain.address?.toLowerCase() ?? ""}:${chain.token?.toLowerCase() ?? ""}:${deploymentBlock.toString()}:3.0:3`,
  );
  let running = false;
  let stopped = false;
  const reset = () =>
    store.db.transaction(async (tx) => {
      await tx.delete(events);
      await tx
        .delete(records)
        .where(
          and(
            eq(records.kind, "campaign-metadata"),
            sql`${records.payload}->>'indexedAttachment' = 'true'`,
          ),
        );
      await tx
        .update(records)
        .set({ payload: sql`${records.payload} - 'launchTxHash' - 'launchIndexed'` })
        .where(and(eq(records.kind, "draft"), sql`${records.payload}->>'launchIndexed' = 'true'`));
      await tx.delete(records).where(inArray(records.kind, [...projectionKinds, "indexer"]));
      await tx
        .delete(records)
        .where(and(eq(records.kind, "notification"), sql`${records.payload}->>'source' = 'chain'`));
    });
  const sync = async () => {
    await chain.ready();
    let previous = await store.get("indexer", "cursor");
    const old = cursorSchema.safeParse(previous?.payload);
    if (previous && (!old.success || old.data.configFingerprint !== configFingerprint)) {
      await reset();
      previous = undefined;
    }
    if (previous) {
      const cursor = cursorSchema.parse(previous.payload);
      const block = await chain.client.getBlock({ blockNumber: BigInt(cursor.blockNumber) });
      const providerHead = await sourceHead(store, chain.chainId, options.source);
      if (
        block.hash !== cursor.blockHash ||
        (providerHead !== null && providerHead < BigInt(cursor.blockNumber))
      ) {
        await reset();
        previous = undefined;
      }
    }
    const head = await chain.client.getBlock();
    let target = head.number > 2n ? head.number - 2n : 0n;
    const providerHead = await sourceHead(store, chain.chainId, options.source);
    if (providerHead !== null && providerHead < target) target = providerHead;
    const fromBlock = previous
      ? BigInt(cursorSchema.parse(previous.payload).blockNumber) + 1n
      : deploymentBlock;
    if (fromBlock > target) return { status: "idle" as const };
    const maximum = options.source === "envio" ? 19999n : 1999n;
    const toBlock = fromBlock + maximum < target ? fromBlock + maximum : target;
    const block = await chain.client.getBlock({ blockNumber: toBlock });
    const batch = await sourceEvents(store, chain, options.source, fromBlock, toBlock);
    const blockHashes = new Map(batch.map((event) => [event.blockNumber, event.blockHash]));
    for (const [number, hash] of blockHashes) {
      if ((await chain.client.getBlock({ blockNumber: BigInt(number) })).hash !== hash)
        throw new Error("Indexed event is not in the canonical chain.");
    }
    const projected = await projectBatch(store, chain, batch, toBlock, options.source);
    projected.push(
      ...(await deriveBatch(store, batch, projected, new Date(Number(block.timestamp) * 1000))),
    );
    if ((await chain.client.getBlock({ blockNumber: toBlock })).hash !== block.hash)
      throw new Error("Projection snapshot was reorganized.");
    const payload = cursorSchema.parse({
      blockNumber: toBlock.toString(),
      blockHash: block.hash,
      indexedAt: new Date().toISOString(),
      indexedBlockAt: new Date(Number(block.timestamp) * 1000).toISOString(),
      blockTimestamp: block.timestamp.toString(),
      source: options.source,
      configFingerprint,
      head: head.number.toString(),
      headTimestamp: new Date(Number(head.timestamp) * 1000).toISOString(),
      lagSeconds: Math.max(0, Number(head.timestamp - block.timestamp)),
      status:
        toBlock < target ? "syncing" : head.timestamp - block.timestamp > 15n ? "behind" : "live",
    });
    await store.db.transaction(async (tx) => {
      if (batch.length) await tx.insert(events).values(batch).onConflictDoNothing();
      for (const item of projected) {
        const statement = tx.insert(records).values(item);
        if (item.kind === "notification") await statement.onConflictDoNothing();
        else
          await statement.onConflictDoUpdate({
            target: [records.kind, records.id],
            set: { owner: item.owner, payload: item.payload, updatedAt: new Date() },
          });
      }
      await tx
        .insert(records)
        .values({ kind: "indexer", id: "cursor", owner: "system", payload })
        .onConflictDoUpdate({
          target: [records.kind, records.id],
          set: { payload, updatedAt: new Date() },
        });
      await tx.delete(records).where(and(eq(records.kind, "indexer"), eq(records.id, "failure")));
    });
    return { status: "indexed" as const, blockNumber: payload.blockNumber, events: batch.length };
  };
  const tick = async () => {
    if (running || stopped || !chain.address) return { status: "idle" as const };
    running = true;
    try {
      return await store.exclusive("spoke-indexer", sync);
    } catch (error) {
      if (error instanceof ApiProblem && error.code === "TX_PENDING")
        return { status: "busy" as const };
      try {
        await store.put("indexer", "failure", "system", {
          status: "failed",
          at: new Date().toISOString(),
        });
      } catch {
        process.stderr.write(
          "Indexer failure reporting is unavailable while the database is down.\n",
        );
      }
      process.stderr.write("Indexer sync failed; retaining the last committed cursor.\n");
      return { status: "failed" as const };
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    void tick();
  }, options.pollIntervalMs ?? 5000);
  timer.unref();
  return {
    tick,
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
};
