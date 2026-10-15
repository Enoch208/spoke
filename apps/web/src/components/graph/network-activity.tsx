"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClientOutput } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref, routeTo } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";

type Activity = ClientOutput<"campaigns.activity">["items"][number];
const labels: Record<Activity["kind"], string> = {
  salePending: "Purchase confirmed · rewards pending",
  saleSettled: "Sale settled",
  saleFinalized: "Sale finalized · rewards available",
  saleRefunded: "Sale refunded · rewards reversed",
  linkCreated: "Referral link created",
  claimed: "Payout claimed",
  funded: "Campaign funded",
  paused: "Campaign paused",
  resumed: "Campaign resumed",
  ended: "Campaign ended",
  termsPublished: "Terms published",
};

export function NetworkActivity({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState<{ campaignId: string; cursor?: string | undefined }>({
    campaignId,
  });
  const cursor = page.campaignId === campaignId ? page.cursor : undefined;
  const activity = useClientQuery(
    "campaigns.activity",
    { campaignId, limit: 12, ...(cursor ? { cursor } : {}) },
    { refetchInterval: 15_000 },
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const data = activity.data;
  const growth = data?.growth ?? [];
  const selected = growth.find((point) => point.day === selectedDay) ?? growth.at(-1);
  const max = Math.max(1, ...growth.map((point) => point.totalLinks));
  const lag = data?.indexedAt ? activity.dataUpdatedAt - Date.parse(data.indexedAt) : null;
  return (
    <section className="grid min-w-0 gap-4" aria-label="Network Activity">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-h4">Network Activity</h2>
          <p className="text-subtle mt-1 text-sm">
            Confirmed participation, purchases and settlements. Updates every 15 seconds while this
            page is visible.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setPage({ campaignId });
            void activity.refetch();
          }}
          disabled={activity.isFetching}
        >
          {activity.isFetching ? "Checking…" : "Refresh latest"}
        </Button>
      </div>
      {activity.error ? (
        <p role="alert" className="text-sm">
          Activity could not refresh.{" "}
          {data ? "The last loaded snapshot is shown." : "Try refreshing again."}
        </p>
      ) : null}
      {activity.isPending ? (
        <p role="status" className="text-subtle text-sm">
          Loading confirmed activity…
        </p>
      ) : null}
      {data ? (
        <>
          <p className="text-subtle text-xs">
            {data.indexedBlock
              ? `Indexed through block ${data.indexedBlock}`
              : "Indexer checkpoint unavailable"}
            {data.indexedAt ? ` · last checked ${new Date(data.indexedAt).toLocaleString()}` : ""}
            {lag !== null && lag > 60_000
              ? " · indexing is catching up; recent transactions may be missing"
              : ""}
          </p>
          {growth.length ? (
            <Card className="grid min-w-0 gap-3">
              <h3 className="font-medium">How this network is growing</h3>
              <p className="text-subtle text-xs">
                Total confirmed referral links · last 30 days · UTC
              </p>
              <div
                className="flex h-28 items-end gap-1"
                role="group"
                aria-label="Choose a day to inspect network growth"
              >
                {growth.map((point) => (
                  <button
                    type="button"
                    key={point.day}
                    aria-label={`${point.day}: ${String(point.totalLinks)} total links, ${String(point.newLinks)} new links`}
                    aria-pressed={point.day === selected?.day}
                    onClick={() => {
                      setSelectedDay(point.day);
                    }}
                    className="group flex h-full min-w-0 flex-1 items-end rounded-t-sm focus-visible:outline-2"
                  >
                    <span
                      className={`w-full rounded-t-sm ${point.day === selected?.day ? "bg-ink" : "bg-lime-300"}`}
                      style={{ height: `${String(Math.max(3, (point.totalLinks / max) * 100))}%` }}
                    />
                  </button>
                ))}
              </div>
              <div className="text-subtle flex justify-between text-xs">
                <span>{growth[0]?.day}</span>
                <span>{growth.at(-1)?.day}</span>
              </div>
              {selected ? (
                <p className="text-sm" aria-live="polite">
                  {selected.day}: {selected.newLinks} new links · {selected.purchases} purchases ·{" "}
                  {selected.finalized} finalizations · {selected.refunded} refunds
                </p>
              ) : null}
              <p className="text-subtle text-xs">
                Each count is an event on that day. Finalizations and refunds may refer to purchases
                made earlier.
              </p>
            </Card>
          ) : null}
          <Card>
            {data.items.length ? (
              <ol className="divide-hairline divide-y">
                {data.items.map((item, index) => (
                  <li
                    key={item.id ?? `${item.tx.hash}:${item.kind}:${String(index)}`}
                    className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium">{labels[item.kind]}</p>
                      <p className="text-subtle mt-1 text-sm">
                        {item.actor.displayName ??
                          (item.actor.handle
                            ? `@${item.actor.handle}`
                            : "Private participant")}{" "}
                        · <time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-3 text-sm">
                      {item.saleId ? (
                        <Link
                          className="underline underline-offset-4"
                          href={receiptHref(item.saleId, activeChain.id)}
                        >
                          Receipt #{item.saleId}
                        </Link>
                      ) : null}
                      {item.nodeId && item.nodeId !== "0" ? (
                        <Link
                          className="underline underline-offset-4"
                          href={`${routeTo.campaignNetwork(campaignId)}?node=${item.nodeId}${item.saleId ? `&sale=${item.saleId}` : ""}`}
                        >
                          View path
                        </Link>
                      ) : null}
                      {item.tx.explorerUrl ? (
                        <a
                          className="underline underline-offset-4"
                          href={item.tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Transaction
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-subtle text-sm">
                No confirmed activity yet. The first referral link or purchase will appear here
                automatically.
              </p>
            )}
            {data.nextCursor || cursor ? (
              <div className="mt-5 flex gap-2">
                {cursor ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPage({ campaignId });
                    }}
                  >
                    Latest activity
                  </Button>
                ) : null}
                {data.nextCursor ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPage({ campaignId, cursor: data.nextCursor ?? undefined });
                    }}
                  >
                    Older activity
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Card>
        </>
      ) : null}
    </section>
  );
}
