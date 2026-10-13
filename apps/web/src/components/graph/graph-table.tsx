"use client";

import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { SaleStateChip } from "@/components/product/state-chips";
import { formatCount } from "@/lib/format";
import { activityCopy, explorerCopy as copy } from "./copy";
import type { Activity } from "./canvas-node";
import type { Graph, GraphNode, Placed } from "./model";
import { personLabel } from "./person";

const views = ["links", "sales"] as const;

export function GraphTable({
  graph,
  placed,
  isSelf,
  activityOf,
  selectedSale,
  onToggle,
  onSelectNode,
  onSelectSale,
}: {
  graph: Graph;
  placed: readonly Placed[];
  isSelf: (node: GraphNode) => boolean;
  activityOf: (node: GraphNode) => Activity;
  selectedSale: string | null;
  onToggle: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectSale: (saleId: string) => void;
}) {
  const [view, setView] = useState<(typeof views)[number]>("links");
  const label = (node: GraphNode) =>
    personLabel(node.owner, {
      self: isSelf(node),
      hidden: node.moderationFlag && !isSelf(node),
      ...(node.owner.visibility === "private" ? { nodeId: node.nodeId } : {}),
    });
  const rows = placed.flatMap((entry) => (entry.data.kind === "node" ? [entry.data] : []));
  const markers = [...graph.markers].sort((a, b) =>
    b.saleId.localeCompare(a.saleId, undefined, { numeric: true }),
  );
  return (
    <Tabs value={view} values={views} onValueChange={setView}>
      <TabList
        value={view}
        label={copy.view.table}
        items={[
          { value: "links", label: copy.table.links, count: formatCount(rows.length) },
          { value: "sales", label: copy.table.sales, count: formatCount(markers.length) },
        ]}
      />
      <TabPanel value="links">
        <Table caption={copy.table.links}>
          <THead>
            <tr>
              <Th>{copy.table.person}</Th>
              <Th numeric>{copy.table.level}</Th>
              <Th>{copy.table.parent}</Th>
              <Th numeric>{copy.table.under}</Th>
              <Th>{copy.table.salesCol}</Th>
              <Th>{copy.table.activity}</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((datum) => {
              const node = datum.node;
              const parent = graph.nodes.get(node.parentNodeId);
              const indent = Math.max(0, node.depth - 1) * 16;
              return (
                <Tr
                  key={node.nodeId}
                  interactive
                  role="row"
                  aria-level={node.depth}
                  onClick={() => {
                    onSelectNode(node.nodeId);
                  }}
                >
                  <Td>
                    <span className="flex items-center gap-1.5" style={{ paddingLeft: indent }}>
                      {node.childCount > 0 ? (
                        <button
                          type="button"
                          aria-expanded={!datum.collapsed}
                          aria-label={datum.collapsed ? copy.expandBranch : copy.collapse}
                          className="hover:bg-pill flex size-6 cursor-pointer items-center justify-center rounded-full"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggle(node.nodeId);
                          }}
                        >
                          <HugeiconsIcon
                            icon={datum.collapsed ? ArrowRight01Icon : ArrowDown01Icon}
                            size={14}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        <span className="size-6" />
                      )}
                      <span className="text-ink font-medium">{label(node)}</span>
                    </span>
                  </Td>
                  <Td numeric>{node.depth}</Td>
                  <Td className="text-body">{parent ? label(parent) : "—"}</Td>
                  <Td numeric>{formatCount(node.childCount)}</Td>
                  <Td className="text-body whitespace-nowrap">
                    {formatCount(node.counts.pending)} · {formatCount(node.counts.finalized)} ·{" "}
                    {formatCount(node.counts.refunded)}
                  </Td>
                  <Td className="text-body">{activityCopy[activityOf(node)]}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </TabPanel>
      <TabPanel value="sales">
        <Table caption={copy.table.sales}>
          <THead>
            <tr>
              <Th>{copy.table.sale}</Th>
              <Th>{copy.table.node}</Th>
              <Th>{copy.table.state}</Th>
            </tr>
          </THead>
          <TBody>
            {markers.map((marker) => {
              const node = graph.nodes.get(marker.nodeId);
              return (
                <Tr
                  key={marker.saleId}
                  interactive
                  selected={selectedSale === marker.saleId}
                  onClick={() => {
                    onSelectSale(marker.saleId);
                  }}
                >
                  <Td className="font-medium">#{marker.saleId}</Td>
                  <Td className="text-body">{node ? label(node) : "—"}</Td>
                  <Td>
                    <SaleStateChip status={marker.state} />
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </TabPanel>
    </Tabs>
  );
}
