"use client";

import { ShoppingBag01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TBody, THead, Table, Th, Tr } from "@/components/ui/table";
import { TabList, Tabs } from "@/components/ui/tabs";
import { useClientContext, useSpokeClient } from "@/lib/client/provider";
import { emptyStates } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { useNow } from "@/lib/use-now";
import { useWide } from "../checkout/use-wide";
import { purchaseCopy } from "../copy/purchase";
import { InProgressStrip } from "./in-progress";
import { PurchaseCard, PurchaseTableRow, type PurchaseRow } from "./purchase-row";

const copy = purchaseCopy.list;
const filters = ["all", "pending", "settled", "refunded"] as const;
type Filter = (typeof filters)[number];
const stateOf = { pending: "PENDING", settled: "FINALIZED", refunded: "REFUNDED" } as const;

const isFilter = (value: string | null): value is Filter =>
  value !== null && filters.some((filter) => filter === value);

const matches = (row: PurchaseRow, filter: Filter) =>
  filter === "all" || row.state === stateOf[filter];

export function PurchasesPage() {
  const now = useNow();
  const wide = useWide();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status");
  const filter: Filter = isFilter(status) ? status : "all";
  const { mode } = useClientContext();
  const client = useSpokeClient();
  const account = useSessionStore((state) => state.address);
  const [more, setMore] = useState<{ items: PurchaseRow[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const first = useClientQuery("receipts.forBuyer", { limit: 100 }, { refetchInterval: 15_000 });
  const rows = [...(first.data?.items ?? []), ...(more?.items ?? [])];
  const cursor = more ? more.cursor : (first.data?.nextCursor ?? null);
  const shown = rows.filter((row) => matches(row, filter));
  const count = (value: Filter) => rows.filter((row) => matches(row, value)).length;
  const demo = mode === "demo";
  const loadMore = async () => {
    if (!client || !cursor) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await client.call("receipts.forBuyer", { limit: 100, cursor });
      setMore({ items: [...(more?.items ?? []), ...page.items], cursor: page.nextCursor });
    } catch (failure) {
      setMoreError(failure instanceof Error ? failure.message : copy.loadMoreFailed);
    } finally {
      setLoadingMore(false);
    }
  };
  const empty = emptyStates["ES-30"];
  return (
    <ProductPage title={copy.title} description={copy.description}>
      <InProgressStrip
        mode={mode}
        account={account}
        listed={new Set(rows.map((row) => row.campaignId))}
      />
      <QueryState
        pending={first.isPending}
        error={first.error}
        retry={() => void first.refetch()}
        loading="rows"
      >
        {rows.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={ShoppingBag01Icon}
              title={empty.title}
              body={empty.body}
              actions={
                <Button asChild>
                  <Link href={routes.explore}>{copy.explore}</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <Tabs
            value={filter}
            values={filters}
            onValueChange={(next) => {
              router.replace(next === "all" ? pathname : `${pathname}?status=${next}`, {
                scroll: false,
              });
            }}
          >
            <TabList
              value={filter}
              label={copy.tabsLabel}
              items={filters.map((value) => ({
                value,
                label: copy.tabs[value],
                count: count(value),
              }))}
            />
            {shown.length === 0 ? (
              <Card padding="none">
                <EmptyState
                  variant="compact"
                  icon={ShoppingBag01Icon}
                  title={filter === "all" ? empty.title : copy.emptyFilter[filter]}
                />
              </Card>
            ) : wide ? (
              <Card padding="none" className="overflow-hidden">
                <Table caption={copy.caption}>
                  <THead>
                    <Tr>
                      <Th>{copy.columns.product}</Th>
                      <Th numeric>{copy.columns.paid}</Th>
                      <Th>{copy.columns.status}</Th>
                      <Th>{copy.columns.referral}</Th>
                      <Th>{copy.columns.purchased}</Th>
                      <Th className="text-right">
                        <span className="sr-only">{copy.columns.action}</span>
                      </Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {shown.map((row, index) => (
                      <PurchaseTableRow
                        key={row.saleId}
                        row={row}
                        now={now}
                        first={index === 0}
                        demo={demo}
                      />
                    ))}
                  </TBody>
                </Table>
              </Card>
            ) : (
              <ul className="grid gap-3">
                {shown.map((row) => (
                  <PurchaseCard key={row.saleId} row={row} now={now} demo={demo} />
                ))}
              </ul>
            )}
            {cursor ? (
              <Button
                variant="secondary"
                className="self-center"
                loading={loadingMore}
                onClick={() => void loadMore()}
              >
                {copy.loadMore}
              </Button>
            ) : null}
            {moreError ? (
              <p role="alert" className="text-pink-ink text-center text-sm">
                {moreError}
              </p>
            ) : null}
          </Tabs>
        )}
      </QueryState>
    </ProductPage>
  );
}
