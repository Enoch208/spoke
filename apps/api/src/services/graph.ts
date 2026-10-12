import { z } from "zod";
import { graphNode, graphSlice, pathEntry } from "@spoke/protocol";
import type { Store, StoredRecord } from "../db/store.js";
import { nodeActivity } from "./graph-activity.js";
import { actorView } from "./evidence.js";
import { allocations, ancestry } from "./views.js";
import { counts, indexedBlock, relatedRecords } from "./read-utils.js";

export const graphNodeView = async (store: Store, row: StoredRecord, reveal = false) => {
  const [nodes, sales, path] = await Promise.all([
    relatedRecords(store, "node", "campaignId", z.string().parse(row.payload.campaignId)),
    relatedRecords(store, "receipt", "nodeId", row.id),
    ancestry(store, row.id),
  ]);
  return graphNode.parse({
    nodeId: row.id,
    campaignId: row.payload.campaignId,
    parentNodeId: row.payload.parentId,
    owner: await actorView(store, z.string().parse(row.payload.creator), reveal),
    depth: path.rows.length,
    childCount: nodes.filter((node) => node.payload.parentId === row.id).length,
    hiddenChildCount: 0,
    counts: counts(sales),
    moderationFlag: false,
    activity: await nodeActivity(store, row, sales),
  });
};
export const sliceView = async (
  store: Store,
  rows: StoredRecord[],
  truncated: boolean,
  reveal: boolean | Set<string> = false,
) => {
  const ids = new Set(rows.map((row) => row.id));
  const receipts = (
    await Promise.all(
      [...new Set(rows.map((row) => z.string().parse(row.payload.campaignId)))].map((id) =>
        relatedRecords(store, "receipt", "campaignId", id),
      ),
    )
  ).flat();
  return graphSlice.parse({
    nodes: (
      await Promise.all(
        rows.map((row) =>
          graphNodeView(store, row, typeof reveal === "boolean" ? reveal : reveal.has(row.owner)),
        ),
      )
    ).map((node) => ({
      ...node,
      hiddenChildCount: Math.max(
        0,
        node.childCount - rows.filter((row) => row.payload.parentId === node.nodeId).length,
      ),
    })),
    edges: rows
      .filter(
        (row) => row.payload.parentId !== "0" && ids.has(z.string().parse(row.payload.parentId)),
      )
      .map((row) => ({ from: row.payload.parentId, to: row.id })),
    saleMarkers: receipts
      .filter((row) => ids.has(z.string().parse(row.payload.nodeId)))
      .map((row) => ({
        saleId: row.id,
        nodeId: row.payload.nodeId,
        state: ["NONE", "PENDING", "REFUNDED", "FINALIZED"][z.number().parse(row.payload.status)],
      })),
    truncated,
    indexedBlock: await indexedBlock(store),
  });
};
export const pathView = async (
  store: Store,
  nodeId: string,
  split: z.infer<typeof allocations>,
  states: string[] = [],
) => {
  const path = await ancestry(store, nodeId);
  const seen = new Set<string>();
  const nodes = await Promise.all(
    path.rows.map(async (row, depth) => {
      const creator = z.string().parse(row.payload.creator).toLowerCase();
      const allocation = split.find(
        (item) => item.depth === depth && item.recipient.toLowerCase() === creator,
      );
      const repeatedWallet = seen.has(creator);
      seen.add(creator);
      return pathEntry.parse({
        nodeId: row.id,
        creator: await actorView(store, creator),
        depth,
        paid: allocation !== undefined,
        repeatedWallet,
        outsideWindow: allocation === undefined,
        effectiveWeightBps: allocation?.effectiveWeightBps ?? 0,
        amount: allocation?.amount ?? "0",
        state: allocation ? (states[split.indexOf(allocation)] ?? null) : null,
        reasonIfUnpaid: allocation
          ? states[split.indexOf(allocation)] === "refunded"
            ? "REFUNDED"
            : null
          : "OUTSIDE_DEPTH",
      });
    }),
  );
  return { nodes, truncated: path.truncated };
};
export const descendantsOf = (rows: StoredRecord[], id: string) => {
  const selected: StoredRecord[] = [];
  let parents = new Set([id]);
  let depth = 0;
  while (parents.size && depth < 256) {
    const next = rows.filter(
      (row) =>
        parents.has(z.string().parse(row.payload.parentId)) &&
        !selected.some((item) => item.id === row.id),
    );
    selected.push(...next);
    parents = new Set(next.map((row) => row.id));
    depth++;
  }
  return selected;
};
