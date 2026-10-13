"use client";

import { Activity01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { formatCount, formatRelative, pluralize } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { campaignCopy } from "../copy/campaign";
import { actorName } from "../shared/actor";
import { SectionError } from "../shared/section-error";

const saleKinds = new Set(["salePending", "saleSettled", "saleFinalized", "saleRefunded"]);

function Activity({ campaignId, self }: { campaignId: string; self: string | null }) {
  const activity = useClientQuery("campaigns.activity", { campaignId, limit: 5 });
  if (activity.isPending)
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>
    );
  if (activity.error) return <SectionError retry={() => void activity.refetch()} />;
  const items = activity.data.items;
  if (items.length === 0)
    return (
      <EmptyState variant="compact" icon={Activity01Icon} title={campaignCopy.network.empty} />
    );
  return (
    <ul className="divide-hairline flex flex-col divide-y">
      {items.map((item) => (
        <li
          key={`${item.tx.hash}-${item.kind}`}
          className="flex items-center justify-between gap-3 py-2.5 text-sm"
        >
          <span className="text-ink min-w-0 truncate">
            {campaignCopy.activity[item.kind]}
            {saleKinds.has(item.kind) ? "" : ` · ${actorName(item.actor, { self })}`}
          </span>
          <span className="text-subtle shrink-0">{formatRelative(new Date(item.at))}</span>
        </li>
      ))}
    </ul>
  );
}

export function NetworkSection({ campaignId, self }: { campaignId: string; self: string | null }) {
  const stats = useClientQuery("campaigns.stats", { campaignId });
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-h4 text-ink font-medium">
          {campaignCopy.network.heading}
        </h2>
        <Button asChild variant="secondary" size="sm">
          <Link href={routeTo.campaignNetwork(campaignId)}>{campaignCopy.network.open}</Link>
        </Button>
      </div>
      {stats.isPending ? (
        <Skeleton className="h-10 w-2/3" />
      ) : stats.error ? (
        <SectionError retry={() => void stats.refetch()} />
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-ink font-medium">
            {fill(campaignCopy.network.shape, {
              links: pluralize(stats.data.links, "link"),
              branches: pluralize(stats.data.branches, "branch", "branches"),
              depth: pluralize(stats.data.deepestLevel, "level"),
            })}
          </p>
          <p className="text-body">
            {fill(campaignCopy.network.sales, {
              settled: formatCount(stats.data.sales.finalized),
              pending: formatCount(stats.data.sales.pending),
              refunded: formatCount(stats.data.sales.refunded),
            })}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-subtle text-sm font-medium">{campaignCopy.network.recent}</h3>
        <Activity campaignId={campaignId} self={self} />
      </div>
    </Card>
  );
}
