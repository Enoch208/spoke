import type { ClientOutput } from "@spoke/protocol";
import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";

export type Slice = ClientOutput<"graph.forCampaign">;
export type GraphNode = Slice["nodes"][number];
export type SaleMarker = Slice["saleMarkers"][number];

export type Graph = {
  nodes: ReadonlyMap<string, GraphNode>;
  markers: readonly SaleMarker[];
  indexedBlock: string | null;
  truncated: boolean;
};

export type Datum =
  | { kind: "merchant"; id: string; children: Datum[] }
  | { kind: "node"; id: string; node: GraphNode; children: Datum[]; collapsed: boolean }
  | { kind: "more"; id: string; parentId: string; count: number; children: Datum[] };

export type Placed = HierarchyPointNode<Datum>;

export const merchantId = "merchant";
export const rowGap = 64;
export const columnGap = 176;
export const renderLimit = 400;

export const mergeGraph = (
  slices: readonly (Slice | undefined)[],
  extra: readonly GraphNode[] = [],
): Graph => {
  const nodes = new Map<string, GraphNode>();
  const markers = new Map<string, SaleMarker>();
  let indexedBlock: string | null = null;
  let truncated = false;
  for (const slice of slices) {
    if (!slice) continue;
    for (const node of slice.nodes) nodes.set(node.nodeId, node);
    for (const marker of slice.saleMarkers) markers.set(marker.saleId, marker);
    indexedBlock = slice.indexedBlock ?? indexedBlock;
    truncated = truncated || slice.truncated;
  }
  for (const node of extra) if (!nodes.has(node.nodeId)) nodes.set(node.nodeId, node);
  return { nodes, markers: [...markers.values()], indexedBlock, truncated };
};

const childrenOf = (graph: Graph) => {
  const map = new Map<string, GraphNode[]>();
  for (const node of graph.nodes.values()) {
    const parent =
      node.parentNodeId !== "0" && graph.nodes.has(node.parentNodeId)
        ? node.parentNodeId
        : merchantId;
    const list = map.get(parent) ?? [];
    list.push(node);
    map.set(parent, list);
  }
  for (const list of map.values())
    list.sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true }));
  return map;
};

export const buildTree = (
  graph: Graph,
  collapsed: ReadonlySet<string>,
  maxDepth: number,
): Datum => {
  const kids = childrenOf(graph);
  const visit = (node: GraphNode, depth: number): Datum => {
    const loaded = kids.get(node.nodeId) ?? [];
    const closed = collapsed.has(node.nodeId) || depth >= maxDepth;
    const shown = closed ? [] : loaded.map((child) => visit(child, depth + 1));
    const missing = closed ? node.childCount : Math.max(0, node.childCount - loaded.length);
    const more: Datum[] =
      missing > 0
        ? [
            {
              kind: "more",
              id: `more-${node.nodeId}`,
              parentId: node.nodeId,
              count: missing,
              children: [],
            },
          ]
        : [];
    return {
      kind: "node",
      id: node.nodeId,
      node,
      collapsed: closed && node.childCount > 0,
      children: [...shown, ...more],
    };
  };
  const roots = kids.get(merchantId) ?? [];
  return { kind: "merchant", id: merchantId, children: roots.map((node) => visit(node, 1)) };
};

const countNodes = (datum: Datum): number =>
  1 + datum.children.reduce((sum, child) => sum + countNodes(child), 0);

const depthOf = (datum: Datum): number =>
  datum.children.length === 0 ? 0 : 1 + Math.max(...datum.children.map(depthOf));

export const fitTree = (graph: Graph, collapsed: ReadonlySet<string>, depth: number) => {
  let limit = depth;
  let root = buildTree(graph, collapsed, limit);
  let trimmed = false;
  while (countNodes(root) > renderLimit && limit > 1) {
    limit = Math.min(limit, depthOf(root)) - 1;
    root = buildTree(graph, collapsed, limit);
    trimmed = true;
  }
  return { root, trimmed };
};

export const layout = (root: Datum): Placed[] => {
  const shaped = hierarchy<Datum>(root, (datum) => datum.children);
  return tree<Datum>()
    .nodeSize([rowGap, columnGap])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(shaped)
    .descendants();
};

export const pathTo = (graph: Graph, nodeId: string): string[] => {
  const path: string[] = [];
  let current = graph.nodes.get(nodeId);
  while (current) {
    path.unshift(current.nodeId);
    current = current.parentNodeId === "0" ? undefined : graph.nodes.get(current.parentNodeId);
  }
  return path;
};

export const saleTotals = (node: GraphNode) =>
  node.counts.pending + node.counts.finalized + node.counts.refunded;
