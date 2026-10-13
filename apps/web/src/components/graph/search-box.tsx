"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/lib/client/provider";
import { explorerCopy as copy } from "./copy";
import type { Graph, GraphNode } from "./model";
import { personLabel } from "./person";

type Hit = { kind: "node"; node: GraphNode } | { kind: "sale"; saleId: string; nodeId: string };

const noMatches = (): GraphNode[] => [];

const searchLoaded = (graph: Graph, raw: string): Hit[] => {
  const q = raw.trim().toLowerCase().replace(/^[@#]/, "");
  if (!q) return [];
  const sales = graph.markers
    .filter((marker) => marker.saleId.toLowerCase().includes(q))
    .map((marker): Hit => ({ kind: "sale", saleId: marker.saleId, nodeId: marker.nodeId }));
  const nodes = [...graph.nodes.values()]
    .filter((node) => {
      const handle =
        node.owner.visibility === "private" ? "" : (node.owner.handle ?? "").toLowerCase();
      return node.nodeId.toLowerCase() === q || (handle !== "" && handle.includes(q));
    })
    .map((node): Hit => ({ kind: "node", node }));
  return [...nodes, ...sales].slice(0, 8);
};

export function SearchBox({
  graph,
  campaignId,
  isSelf,
  onNode,
  onSale,
}: {
  graph: Graph;
  campaignId: string;
  isSelf: (nodeId: string) => boolean;
  onNode: (nodeId: string) => void;
  onSale: (saleId: string) => void;
}) {
  const { client } = useClientContext();
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<readonly GraphNode[] | null>(null);
  const hits = searchLoaded(graph, q);
  const remoteHits = (remote ?? []).filter((node) => !graph.nodes.has(node.nodeId));
  const pick = (action: () => void) => {
    action();
    setQ("");
    setRemote(null);
  };
  const searchAll = async () => {
    if (!client || !q.trim()) return;
    const found = await client.call("graph.search", { campaignId, q: q.trim() }).catch(noMatches);
    setRemote(found);
  };
  return (
    <div className="relative min-w-0 flex-1 basis-56">
      <label>
        <span className="sr-only">{copy.search}</span>
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-subtle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          data-graph-search
          value={q}
          placeholder={copy.search}
          className="pl-10"
          onChange={(event) => {
            setQ(event.target.value);
            setRemote(null);
          }}
        />
      </label>
      {q.trim() ? (
        <ul className="bg-surface shadow-frame border-hairline absolute inset-x-0 top-12 z-20 grid max-h-72 overflow-y-auto rounded-xl border p-1">
          {[...hits, ...remoteHits.map((node): Hit => ({ kind: "node", node }))].map((hit) => (
            <li key={hit.kind === "node" ? `n-${hit.node.nodeId}` : `s-${hit.saleId}`}>
              <button
                type="button"
                className="hover:bg-soft flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm"
                onClick={() => {
                  pick(() => {
                    if (hit.kind === "node") onNode(hit.node.nodeId);
                    else onSale(hit.saleId);
                  });
                }}
              >
                <span className="text-ink">
                  {hit.kind === "node"
                    ? personLabel(hit.node.owner, {
                        self: isSelf(hit.node.nodeId),
                        nodeId: hit.node.nodeId,
                      })
                    : `#${hit.saleId}`}
                </span>
                <span className="text-subtle font-mono text-xs">
                  {hit.kind === "node" ? hit.node.nodeId : hit.nodeId}
                </span>
              </button>
            </li>
          ))}
          {hits.length === 0 && remote !== null && remoteHits.length === 0 ? (
            <li className="text-subtle px-3 py-2 text-sm">{copy.noMatches}</li>
          ) : null}
          <li>
            <button
              type="button"
              className="text-ink hover:bg-soft w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium"
              onClick={() => void searchAll()}
            >
              {copy.searchCampaign}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
