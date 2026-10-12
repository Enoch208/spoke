"use client";

import { SaleStateChip } from "@/components/product/state-chips";
import { useState } from "react";
import Link from "next/link";
import { ProductPage, QueryState, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";
import { formatPerson } from "@/lib/format";

export function NetworkPage({ campaignId }: { campaignId?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const graph = useClientQuery(
    campaignId ? "graph.forCampaign" : "graph.mine",
    campaignId ? { campaignId } : {},
  );
  const node = graph.data?.nodes.find((item) => item.nodeId === selected);
  const levels = [...new Set(graph.data?.nodes.map((item) => item.depth) ?? [])].sort(
    (a, b) => a - b,
  );
  return (
    <ProductPage
      title="The distribution graph"
      description="Every link has one parent. A sale rewards the eligible ancestors in its path, nearest first."
      actions={
        campaignId ? <PageLink href={`/c/${campaignId}`}>Back to campaign</PageLink> : undefined
      }
    >
      <QueryState pending={graph.isPending} error={graph.error} retry={() => void graph.refetch()}>
        <div className="bg-pill overflow-x-auto rounded-3xl p-5">
          <div className="flex min-w-max items-start gap-8">
            {levels.map((depth) => (
              <section key={depth} className="w-48 space-y-3">
                <h2 className="text-subtle text-sm">Depth {depth}</h2>
                {graph.data?.nodes
                  .filter((item) => item.depth === depth)
                  .map((item) => (
                    <button
                      key={item.nodeId}
                      onClick={() => {
                        setSelected(item.nodeId);
                      }}
                      className={`bg-surface w-full rounded-xl border p-4 text-left ${selected === item.nodeId ? "border-ink" : "border-hairline"}`}
                    >
                      <span className="block font-medium">{formatPerson(item.owner)}</span>
                      <span className="text-subtle block text-xs">
                        Link #{item.nodeId} · {item.childCount} children
                      </span>
                      <span className="text-subtle block text-xs">
                        {item.counts.finalized} settled sales
                      </span>
                    </button>
                  ))}
              </section>
            ))}
          </div>
          {levels.length === 0 ? <p>No distribution links yet.</p> : null}
        </div>
        {node ? (
          <Card>
            <h2 className="font-display text-h4">Link #{node.nodeId}</h2>
            <p className="text-body mt-2">
              Created by {formatPerson(node.owner)} · Parent #{node.parentNodeId} · Depth{" "}
              {node.depth}
            </p>
            <p className="text-subtle mt-2">
              {node.counts.pending} pending · {node.counts.finalized} settled ·{" "}
              {node.counts.refunded} refunded
            </p>
          </Card>
        ) : null}
        <details className="rounded-xl border border-hairline p-4">
          <summary className="cursor-pointer font-medium">View as a table</summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Link</th>
                  <th className="p-2">Creator</th>
                  <th className="p-2">Parent</th>
                  <th className="p-2">Depth</th>
                  <th className="p-2">Settled sales</th>
                </tr>
              </thead>
              <tbody>
                {graph.data?.nodes.map((item) => (
                  <tr key={item.nodeId} className="border-hairline border-t">
                    <td className="p-2">#{item.nodeId}</td>
                    <td className="p-2">{formatPerson(item.owner)}</td>
                    <td className="p-2">#{item.parentNodeId}</td>
                    <td className="p-2">{item.depth}</td>
                    <td className="p-2">{item.counts.finalized}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {graph.data?.truncated ? (
          <p className="text-subtle text-sm">
            This slice is truncated. Select a smaller branch to inspect it.
          </p>
        ) : null}
        <div>
          <h2 className="font-display text-h4 mb-3">Sales in this network</h2>
          <div className="flex flex-wrap gap-2">
            {graph.data?.saleMarkers.map((sale) => (
              <Link
                key={sale.saleId}
                href={`/receipts/10143/${sale.saleId}`}
                className="bg-surface border-hairline hover:border-line ease-spring inline-flex items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-sm transition-colors duration-[423ms]"
              >
                Sale #{sale.saleId}
                <SaleStateChip status={sale.state} />
              </Link>
            ))}
          </div>
        </div>
        <p className="text-subtle text-xs">
          Indexed through block {graph.data?.indexedBlock ?? "not yet recorded"}. Attribution
          describes link ancestry, not influence.
        </p>
      </QueryState>
    </ProductPage>
  );
}
