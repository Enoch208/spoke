import { sampleHash } from "../../../../demo/world/ids";
import type { DemoId, DemoNode } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import { DEMO_CHAIN_ID, addressesOf, blockAt } from "../views/basics";
import { campaignOf } from "../views/catalog";

export const EXPORT_SCHEMA_VERSION = "demo-1";

type ExportInput = DemoInput<"graph.export">;

const rootsOf = (world: DemoWorld, input: ExportInput, personaId: string): DemoNode[] => {
  if (input.scope === "mine") {
    const mine = addressesOf(world, personaId).map((address) => address.toLowerCase());
    return world.nodes.filter((node) => mine.includes(node.owner.toLowerCase()));
  }
  if (input.campaignId === undefined)
    return fail("VALIDATION_FAILED", "Choose a campaign to export.");
  const campaign = found(campaignOf(world, input.campaignId), "This campaign");
  return world.nodes.filter((node) => node.campaignId === campaign.id && node.parentId === null);
};

const subtree = (
  world: DemoWorld,
  roots: readonly DemoNode[],
  depth: number,
  until: number,
): DemoNode[] => {
  const children = new Map<DemoId, DemoNode[]>();
  for (const node of world.nodes)
    if (node.parentId !== null)
      children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  const picked = new Map<DemoId, DemoNode>();
  let level = roots.filter((node) => node.createdAt <= until);
  for (let step = 1; step <= depth && level.length > 0; step += 1) {
    for (const node of level) picked.set(node.id, node);
    level = level
      .flatMap((node) => children.get(node.id) ?? [])
      .filter((node) => node.createdAt <= until && !picked.has(node.id));
  }
  return [...picked.values()];
};

export const graphExportReads = {
  "graph.export": (input, runtime) => {
    const { world } = runtime;
    const from = Date.parse(input.period.from);
    const to = Math.min(Date.parse(input.period.to), runtime.now());
    if (from > to) fail("VALIDATION_FAILED", "The export period ends before it starts.");
    const nodes = subtree(world, rootsOf(world, input, runtime.personaId()), input.depth, to);
    const ids = new Set(nodes.map((node) => node.id));
    const edges = nodes.filter((node) => node.parentId !== null && ids.has(node.parentId));
    const sales = world.sales.filter(
      (sale) =>
        sale.nodeId !== null &&
        ids.has(sale.nodeId) &&
        input.saleStates.includes(sale.status) &&
        sale.purchasedAt >= from &&
        sale.purchasedAt <= to,
    );
    const key = sampleHash(
      `graph-export:${JSON.stringify([input.scope, input.campaignId ?? null, input.depth, input.saleStates, input.period, input.format, input.scope === "mine" ? runtime.personaId() : null])}`,
    ).slice(2, 18);
    const file = (name: string, rows: readonly string[]) => ({
      url: `https://usespoke.xyz/demo/exports/${key}/sample-${name}.${input.format}`,
      rows: rows.length,
      sha256: sampleHash(`graph-export:${key}:${name}:${rows.join(",")}`).slice(2),
    });
    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      chainId: DEMO_CHAIN_ID,
      fromBlock: blockAt(from),
      toBlock: blockAt(to),
      files: [
        file(
          "nodes",
          nodes.map((node) => node.id),
        ),
        file(
          "edges",
          edges.map((node) => `${node.parentId ?? ""}>${node.id}`),
        ),
        file(
          "sales",
          sales.map((sale) => sale.id),
        ),
      ],
    };
  },
} satisfies PartialHandlers<"graph">;

export const graphExportWrites = {} satisfies PartialHandlers<"graph">;
