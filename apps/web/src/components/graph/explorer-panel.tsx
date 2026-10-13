"use client";

import { cx } from "@/components/ui/cx";
import { NodePanel } from "./node-panel";
import type { Graph } from "./model";
import { SalePanel } from "./sale-panel";
import { SalesList } from "./sales-list";

export function ExplorerPanel({
  graph,
  campaignId,
  merchant,
  earn,
  node,
  sale,
  hidden,
  selfNodes,
  canJoin,
  onSelectNode,
  onSelectSale,
}: {
  graph: Graph;
  campaignId: string | null;
  merchant: string;
  earn: boolean;
  node: string | null;
  sale: string | null;
  hidden: boolean;
  selfNodes: ReadonlySet<string>;
  canJoin: boolean;
  onSelectNode: (nodeId: string) => void;
  onSelectSale: (saleId: string) => void;
}) {
  if (hidden && !node) return null;
  return (
    <aside
      aria-label={sale ? `Sale ${sale}` : node ? `Link ${node}` : undefined}
      className={cx(
        "bg-surface border-hairline min-w-0 self-start rounded-2xl border p-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto",
      )}
    >
      {sale ? (
        <SalePanel saleId={sale} compact />
      ) : node ? (
        <NodePanel
          graph={graph}
          nodeId={node}
          merchant={merchant}
          isSelf={(nodeId) => selfNodes.has(nodeId)}
          onSelect={onSelectNode}
          joinCampaign={canJoin ? campaignId : null}
        />
      ) : campaignId ? (
        <SalesList
          graph={graph}
          campaignId={campaignId}
          earn={earn}
          isSelf={(nodeId) => selfNodes.has(nodeId)}
          onSelectSale={onSelectSale}
        />
      ) : null}
    </aside>
  );
}
