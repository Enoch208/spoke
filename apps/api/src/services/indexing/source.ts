import { sql } from "drizzle-orm";
import {
  spokeProtocolAbi,
  demoTokenAbi,
  addressString,
  bytes32String,
  uintString,
} from "@spoke/protocol";
import { z } from "zod";
import type { Store } from "../../db/store.js";
import type { ChainService } from "../chain.js";
import { wire } from "../chain.js";

export const sourceEvent = z.object({
  id: z.string(),
  chainId: z.number().int(),
  txHash: bytes32String,
  logIndex: z.number().int().nonnegative(),
  blockHash: bytes32String,
  blockNumber: uintString,
  name: z.string(),
  payload: z.record(z.string(), z.unknown()),
  at: z.date(),
});
export type SourceEvent = z.infer<typeof sourceEvent>;
export type IndexerSource = "direct_rpc" | "envio";

export const sourceHead = async (store: Store, chainId: number, source: IndexerSource) => {
  if (source === "direct_rpc") return null;
  const rows = await store.db.execute(
    sql`select "blockNumber"::text as "blockNumber" from envio."IndexerCheckpoint" where "chainId" = ${chainId}`,
  );
  const [row] = z.array(z.object({ blockNumber: uintString })).parse(rows);
  if (!row) throw new Error("HyperIndex has not committed its first checkpoint.");
  return BigInt(row.blockNumber);
};

export const sourceEvents = async (
  store: Store,
  chain: ChainService,
  source: IndexerSource,
  from: bigint,
  to: bigint,
): Promise<SourceEvent[]> => {
  if (!chain.address) throw new Error("Indexer requires a deployed contract.");
  if (source === "envio") {
    const rows = await store.db.execute(sql`
      select id, "chainId", "contractAddress", "blockNumber"::text as "blockNumber",
        "blockHash", "transactionHash" as "txHash", "logIndex", name, payload,
        timestamp::text as timestamp
      from envio."ChainEvent" where "chainId" = ${chain.chainId}
        and "contractAddress" in (${chain.address.toLowerCase()}, ${chain.token?.toLowerCase() ?? chain.address.toLowerCase()})
        and "blockNumber" >= ${from.toString()} and "blockNumber" <= ${to.toString()}
      order by "blockNumber", "logIndex" limit 10001
    `);
    const parsed = z
      .array(
        z
          .object({
            contractAddress: addressString,
            timestamp: uintString,
            payload: z.string(),
          })
          .loose(),
      )
      .parse(rows);
    if (parsed.length > 10000) throw new Error("HyperIndex batch exceeded its event bound.");
    return parsed.map((row) =>
      sourceEvent.parse({
        ...row,
        payload: {
          ...z.record(z.string(), z.unknown()).parse(JSON.parse(row.payload)),
          contractAddress: row.contractAddress,
        },
        at: new Date(Number(row.timestamp) * 1000),
      }),
    );
  }
  const protocolLogs = await chain.client.getContractEvents({
    address: chain.address,
    abi: spokeProtocolAbi,
    fromBlock: from,
    toBlock: to,
    strict: true,
  });
  const tokenLogs = chain.token
    ? await chain.client.getContractEvents({
        address: chain.token,
        abi: demoTokenAbi,
        eventName: "Transfer",
        fromBlock: from,
        toBlock: to,
        strict: true,
      })
    : [];
  const logs = [...protocolLogs, ...tokenLogs].sort((left, right) =>
    left.blockNumber === right.blockNumber
      ? left.logIndex - right.logIndex
      : left.blockNumber < right.blockNumber
        ? -1
        : 1,
  );
  const timestamps = new Map<string, Date>();
  const batch: SourceEvent[] = [];
  for (const log of logs) {
    let at = timestamps.get(log.blockHash);
    if (!at) {
      const block = await chain.client.getBlock({ blockNumber: log.blockNumber });
      if (block.hash !== log.blockHash) throw new Error("Event block was reorganized.");
      at = new Date(Number(block.timestamp) * 1000);
      timestamps.set(log.blockHash, at);
    }
    batch.push(
      sourceEvent.parse({
        id: `${String(chain.chainId)}:${log.transactionHash}:${String(log.logIndex)}:${log.blockHash}`,
        chainId: chain.chainId,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockHash: log.blockHash,
        blockNumber: log.blockNumber.toString(),
        name: log.eventName,
        payload: {
          ...z.record(z.string(), z.unknown()).parse(wire(log.args)),
          contractAddress: log.address,
        },
        at,
      }),
    );
  }
  return batch;
};
