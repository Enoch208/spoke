import type { ClientOutput } from "@spoke/protocol";
import { pathOf } from "../../../../demo/world/sale-math";
import type { DemoId, DemoNode } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import { addressesOf, blockAt, ownsAddress, personByAddress } from "../views/basics";
import { campaignOf, isMerchantOfCampaign } from "../views/catalog";
import { childrenOf, graphNode, nodeIndex, nodeOf, salePathEntries } from "../views/graph";
import { policyHashOf, purchaseTx, finalizeTx, refundTx, saleOf } from "../views/receipt";

type Slice = ClientOutput<"graph.forCampaign">;
type Filter = Pick<DemoInput<"graph.forCampaign">, "depth" | "childLimit">;

const slice = (
  world: DemoWorld,
  roots: readonly DemoNode[],
  filter: Filter,
  viewerId: string,
  reveal: boolean,
  now: number,
): Slice => {
  const index = nodeIndex(world);
  const maxDepth = filter.depth ?? 16;
  const childLimit = filter.childLimit ?? 100;
  const included = new Map<DemoId, ReturnType<typeof graphNode>>();
  let truncated = false;
  const visit = (node: DemoNode, level: number) => {
    if (included.has(node.id)) return;
    const children = childrenOf(world, node.id);
    const shown = level < maxDepth ? children.slice(0, childLimit) : [];
    if (shown.length < children.length) truncated = true;
    included.set(
      node.id,
      graphNode(world, index, node, viewerId, { reveal, shownChildren: shown.length }),
    );
    for (const child of shown) visit(child, level + 1);
  };
  for (const root of roots) visit(root, 1);
  const ids = new Set(included.keys());
  const nodes = [...included.values()];
  return {
    nodes,
    edges: world.nodes
      .filter((node) => ids.has(node.id) && node.parentId !== null && ids.has(node.parentId))
      .map((node) => ({ from: node.parentId ?? "0", to: node.id })),
    saleMarkers: world.sales
      .filter((sale) => sale.nodeId !== null && ids.has(sale.nodeId))
      .map((sale) => ({ saleId: sale.id, nodeId: sale.nodeId ?? "0", state: sale.status })),
    truncated,
    indexedBlock: blockAt(now),
  };
};

const matches = (world: DemoWorld, node: DemoNode, q: string) => {
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  if (node.id.toLowerCase() === needle) return true;
  if (world.sales.some((sale) => sale.id.toLowerCase() === needle && sale.nodeId === node.id))
    return true;
  const person = personByAddress(world, node.owner);
  if (!person || person.visibility === "private" || node.moderation === "hidden") return false;
  const handle = person.handle?.toLowerCase() ?? "";
  return handle === needle || handle === `demo-${needle}` || handle.includes(needle);
};

export const graphReads = {
  "graph.forCampaign": (input, runtime) => {
    const world = runtime.world;
    const campaign = found(campaignOf(world, input.campaignId), "Campaign");
    const root =
      input.rootNode === undefined ? undefined : found(nodeOf(world, input.rootNode), "Node");
    const roots = root
      ? [root]
      : world.nodes.filter((node) => node.campaignId === campaign.id && node.parentId === null);
    return slice(
      world,
      roots,
      input,
      runtime.personaId(),
      isMerchantOfCampaign(world, runtime.personaId(), campaign),
      runtime.now(),
    );
  },
  "graph.mine": (input, runtime) => {
    const world = runtime.world;
    const mine = addressesOf(world, runtime.personaId()).map((address) => address.toLowerCase());
    const own = world.nodes.filter((node) => mine.includes(node.owner.toLowerCase()));
    const roots =
      input.rootNode === undefined ? own : [found(nodeOf(world, input.rootNode), "Node")];
    return slice(world, roots, input, runtime.personaId(), false, runtime.now());
  },
  "graph.ancestry": (input, runtime) => {
    const world = runtime.world;
    const index = nodeIndex(world);
    const node = found(nodeOf(world, input.nodeId), "Node");
    return {
      nodes: pathOf(index, node.id).map((entry) =>
        graphNode(world, index, entry, runtime.personaId()),
      ),
      truncated: false,
    };
  },
  "graph.salePath": (input, runtime) => {
    const world = runtime.world;
    const sale = found(saleOf(world, input.saleId), "Sale");
    const campaign = found(campaignOf(world, sale.campaignId), "Campaign");
    const evidence = [purchaseTx(sale), finalizeTx(sale), refundTx(sale)].filter(
      (tx) => tx !== null,
    );
    return {
      saleId: sale.id,
      nodes: salePathEntries(world, sale, runtime.personaId()),
      policyHash: policyHashOf(campaign, sale.policyVersion),
      evidence,
      truncated: false,
    };
  },
  "graph.search": (input, runtime) => {
    const world = runtime.world;
    const campaign = found(campaignOf(world, input.campaignId), "Campaign");
    if (input.q.trim().length === 0)
      return fail("VALIDATION_FAILED", "Type a handle, link ID or sale ID.");
    const index = nodeIndex(world);
    return world.nodes
      .filter((node) => node.campaignId === campaign.id && matches(world, node, input.q))
      .slice(0, 25)
      .map((node) =>
        graphNode(world, index, node, runtime.personaId(), {
          reveal: ownsAddress(world, runtime.personaId(), node.owner),
        }),
      );
  },
} satisfies PartialHandlers<"graph">;

export const graphWrites = {} satisfies PartialHandlers<"graph">;
