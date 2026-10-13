"use client";

import { Invoice03Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { SkeletonRows } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { useChainAction } from "@/lib/tx/use-action";
import { useNow } from "@/lib/use-now";
import { salesCopy as copy } from "../copy/sales";
import { Callout } from "../shared/callout";
import { useCampaignNames } from "../shared/hooks";
import { batchLimit, openFinalize } from "../shared/settle";
import { canFinalizeSale } from "./sale-chip";
import { SalesFilters } from "./sales-filters";
import { useSalesQuery } from "./sales-query";
import { SaleCards, SaleTableRows } from "./sales-rows";

export function SalesTable({ campaignId }: { campaignId?: string }) {
  const now = useNow();
  const router = useRouter();
  const start = useChainAction();
  const query = useSalesQuery(campaignId, now);
  const { names } = useCampaignNames();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [overLimit, setOverLimit] = useState(false);
  const ready = query.rows.filter((row) => canFinalizeSale(row.state, row.unlockAt, now));
  const chosen = selected.filter((id) => ready.some((row) => row.saleId === id));
  const toggle = (saleId: string, on: boolean) => {
    if (!on) {
      setOverLimit(false);
      setSelected(chosen.filter((id) => id !== saleId));
      return;
    }
    if (chosen.length >= batchLimit) {
      setOverLimit(true);
      return;
    }
    setSelected([...chosen, saleId]);
  };
  const toggleAll = (on: boolean) => {
    setOverLimit(on && ready.length > batchLimit);
    setSelected(on ? ready.slice(0, batchLimit).map((row) => row.saleId) : []);
  };
  const counts = query.sales.data?.countsByState;
  const total = counts ? counts.pending + counts.finalized + counts.refunded : 0;
  const stateWord = query.tab === "all" ? "" : `${copy.tabs[query.tab].toLowerCase()} `;
  return (
    <div className="space-y-4">
      <SalesFilters
        tab={query.tab}
        period={query.period}
        campaign={query.campaign}
        q={query.q}
        counts={counts}
        fixedCampaign={Boolean(campaignId)}
        onChange={(changes) => {
          setSelected([]);
          query.update(changes);
        }}
      />
      {query.maturing || query.matured ? (
        <Callout
          tone="info"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                query.update({ maturing: null, matured: null });
              }}
            >
              {copy.clear}
            </Button>
          }
        >
          {query.maturing ? copy.maturing : copy.matured}
        </Callout>
      ) : null}
      {chosen.length > 0 || overLimit ? (
        <div className="bg-ink text-page flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <p className="text-sm">
            {overLimit ? copy.batchLimit : `${String(chosen.length)} selected`}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-page hover:text-page/80"
              onClick={() => {
                toggleAll(false);
              }}
            >
              {copy.clearSelection}
            </Button>
            {chosen.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  openFinalize(chosen, start);
                  setSelected([]);
                }}
              >
                {chosen.length === 1
                  ? copy.finalizeOne
                  : fill(copy.finalizeMany, { n: String(chosen.length) })}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <Card padding="none" className="overflow-hidden">
        {query.sales.isPending ? (
          <SkeletonRows rows={8} />
        ) : query.sales.error ? (
          <ErrorState
            variant="section"
            title="We couldn’t load your sales."
            body="Check your connection and try again."
            details={{ requestId: query.sales.error.requestId ?? undefined }}
            actions={
              <Button variant="secondary" onClick={() => void query.sales.refetch()}>
                Try again
              </Button>
            }
          />
        ) : query.rows.length === 0 ? (
          total === 0 && !query.filtered ? (
            <EmptyState
              icon={Invoice03Icon}
              title={copy.emptyTitle}
              body={copy.emptyBody}
              actions={
                <Button asChild variant="secondary">
                  <Link href={campaignId ? `/c/${campaignId}` : "/sell/campaigns"}>
                    {campaignId ? "View the campaign page" : copy.campaigns}
                  </Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="compact"
              title={fill(copy.filteredTitle, { state: stateWord })}
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    query.update({
                      state: null,
                      period: null,
                      q: null,
                      campaign: null,
                      maturing: null,
                      matured: null,
                    });
                  }}
                >
                  {copy.clear}
                </Button>
              }
            />
          )
        ) : (
          <>
            <SaleTableRows
              rows={query.rows}
              now={now}
              names={names}
              showCampaign={!campaignId}
              selected={chosen}
              selectable={ready.length > 0}
              allSelected={
                chosen.length > 0 && chosen.length === Math.min(ready.length, batchLimit)
              }
              onToggle={toggle}
              onToggleAll={toggleAll}
              onOpen={(saleId) => {
                router.push(`/sell/sales/${saleId}`);
              }}
            />
            <SaleCards rows={query.rows} now={now} names={names} showCampaign={!campaignId} />
          </>
        )}
        {query.pages.hasPrevious || query.sales.data?.nextCursor ? (
          <div className="border-hairline border-t px-5 py-3">
            <Pagination
              label={copy.title}
              page={query.pages.page}
              hasPrevious={query.pages.hasPrevious}
              hasNext={Boolean(query.sales.data?.nextCursor)}
              onPrevious={query.pages.previous}
              onNext={() => {
                const cursor = query.sales.data?.nextCursor;
                if (cursor) query.pages.next(cursor);
              }}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
