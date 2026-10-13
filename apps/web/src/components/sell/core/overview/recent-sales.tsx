"use client";

import Link from "next/link";
import { demoToken } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { formatAmount, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { overviewPageCopy as copy } from "../copy/overview";
import { merchantSaleKey, MerchantSaleChip } from "../sales/sale-chip";

export function RecentSales({ now }: { now: number }) {
  const sales = useClientQuery("receipts.forMerchant", { limit: 8 }, { refetchInterval: 15_000 });
  const rows = sales.data?.items ?? [];
  return (
    <Card padding="none" className="overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.recent}</h2>
        <Link href="/sell/sales" className="text-ink text-sm underline-offset-2 hover:underline">
          {copy.seeAllSales}
        </Link>
      </header>
      {sales.isPending ? (
        <SkeletonRows rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState variant="compact" title={copy.recentEmpty} />
      ) : (
        <ul className="divide-hairline divide-y">
          {rows.map((row) => (
            <li key={row.saleId}>
              <Link
                href={routeTo.sale(row.saleId)}
                className="hover:bg-soft ease-spring grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors duration-[423ms] sm:grid-cols-[minmax(0,1fr)_6.5rem_6rem_10.5rem]"
              >
                <div className="min-w-0">
                  <p className="text-ink truncate text-sm font-medium">
                    #{row.saleId} · {row.productTitle}
                  </p>
                  <p className="text-subtle text-xs">
                    {formatRelative(new Date(row.purchasedAt), { now: new Date(now) })} ·{" "}
                    {fill(copy.peoplePaid, {
                      paid: String(row.paidCount),
                      max: String(row.maxPaid),
                    })}
                  </p>
                </div>
                <span className="text-ink text-right font-mono text-sm tabular-nums">
                  {formatAmount(BigInt(row.amountPaid), demoToken)}
                </span>
                <span className="text-subtle hidden text-right font-mono text-xs tabular-nums sm:block">
                  {formatAmount(BigInt(row.reward), demoToken)}
                </span>
                <span className="col-span-2 sm:col-span-1 sm:justify-self-end">
                  <MerchantSaleChip
                    stateKey={merchantSaleKey(row.state, row.unlockAt, row.proceedsState, now)}
                    unlockAt={row.unlockAt}
                    now={now}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
