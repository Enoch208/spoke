"use client";

import Link from "next/link";
import { useState } from "react";
import { ShowMore } from "@/components/ui/pagination";
import { SaleStateChip } from "@/components/product/state-chips";
import { MoneyStateChip } from "@/components/earn/shared/money-state-chip";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { explorerCopy as copy } from "./copy";
import type { Graph } from "./model";
import { personLabel } from "./person";

const byNewest = (a: string, b: string) => b.localeCompare(a, undefined, { numeric: true });

export function SalesList({
  graph,
  campaignId,
  earn,
  isSelf,
  onSelectSale,
}: {
  graph: Graph;
  campaignId: string;
  earn: boolean;
  isSelf: (nodeId: string) => boolean;
  onSelectSale: (saleId: string) => void;
}) {
  const now = useNow();
  const [count, setCount] = useState(12);
  const mine = useClientQuery(
    "earnings.byConversion",
    { campaignId, limit: 100 },
    { enabled: earn },
  );
  const missed = useClientQuery("earnings.missed", { campaignId, limit: 100 }, { enabled: earn });
  const markers = [...graph.markers].sort((a, b) => byNewest(a.saleId, b.saleId));
  const share = (saleId: string) => mine.data?.items.find((item) => item.saleId === saleId);
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-ink text-lg font-medium">{copy.salesInView}</h2>
        {earn && missed.data && missed.data.items.length > 0 ? (
          <Link
            href={`${routes.earn.earnings}?tab=missed`}
            className="text-ink text-sm underline underline-offset-2"
          >
            {fill(copy.notEarned, { n: String(missed.data.items.length) })}
          </Link>
        ) : null}
      </div>
      {markers.length === 0 ? <p className="text-subtle text-sm">{copy.salesEmpty}</p> : null}
      <ul className="divide-hairline -mx-2 divide-y">
        {markers.slice(0, count).map((marker) => {
          const node = graph.nodes.get(marker.nodeId);
          const row = share(marker.saleId);
          return (
            <li key={marker.saleId}>
              <button
                type="button"
                onClick={() => {
                  onSelectSale(marker.saleId);
                }}
                className="hover:bg-soft ease-spring grid w-full cursor-pointer gap-1.5 rounded-xl px-2 py-2.5 text-left transition-colors duration-[423ms]"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-ink text-sm font-medium">#{marker.saleId}</span>
                  {row ? (
                    <MoneyStateChip
                      state={row.state}
                      unlockAt={row.unlockAt}
                      finalizedAt={row.finalizedAt}
                      now={now}
                    />
                  ) : (
                    <SaleStateChip status={marker.state} />
                  )}
                </span>
                <span className="text-subtle text-xs">
                  {node
                    ? fill(copy.through, {
                        person: personLabel(node.owner, {
                          self: isSelf(node.nodeId),
                          hidden: node.moderationFlag && !isSelf(node.nodeId),
                        }),
                      })
                    : null}
                  {earn && !row ? ` · ${copy.notOnYourPath}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {markers.length > count ? (
        <ShowMore
          onClick={() => {
            setCount(count + 12);
          }}
        />
      ) : null}
    </section>
  );
}
