"use client";

import { TxHash } from "@/components/ui/address";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatAmount, formatPerson, formatRelative, type TokenLike } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { activeChain } from "@/lib/wagmi";
import { activityCopy, overviewCopy as copy } from "../copy/campaign";
import { useIsDemo } from "../shared/hooks";

export function ActivityFeed({ campaignId, token }: { campaignId: string; token: TokenLike }) {
  const demo = useIsDemo();
  const activity = useClientQuery("campaigns.activity", { campaignId, limit: 6 });
  const items = activity.data?.items ?? [];
  return (
    <Card padding="none" className="overflow-hidden">
      <h2 className="font-display text-h4 text-ink px-5 pt-5 pb-2 font-medium">{copy.activity}</h2>
      {activity.isPending ? (
        <SkeletonRows rows={5} />
      ) : items.length === 0 ? (
        <EmptyState variant="compact" title={copy.activityEmpty} />
      ) : (
        <ul className="divide-hairline divide-y">
          {items.map((item, index) => (
            <li
              key={`${item.tx.hash}-${item.kind}-${String(index)}`}
              className="flex items-start justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-ink text-sm font-medium">{activityCopy[item.kind]}</p>
                <p className="text-subtle text-xs">
                  {formatPerson({ handle: item.actor.handle, address: item.actor.address })} ·{" "}
                  {formatRelative(new Date(item.at))}
                </p>
                <TxHash
                  hash={item.tx.hash}
                  chainId={activeChain.id}
                  demo={demo}
                  className="text-xs"
                />
              </div>
              {item.amount ? (
                <span className="text-ink shrink-0 font-mono text-sm tabular-nums">
                  {formatAmount(BigInt(item.amount), token)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
