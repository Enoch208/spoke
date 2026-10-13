"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductPage, QueryState } from "@/components/product/page";
import { Select } from "@/components/ui/select";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { fill } from "@/lib/copy";
import { useNow } from "@/lib/use-now";
import { overviewPageCopy as copy } from "../copy/overview";
import { listTabOf } from "../campaigns/campaign-view";
import { rewardBuckets } from "../shared/ledger";
import { pick, useQueryParams } from "../shared/use-query-params";
import { OverviewAlerts } from "./alerts";
import { CampaignSnapshot } from "./campaign-snapshot";
import { SetupChecklist } from "./checklist";
import { KpiRow } from "./kpi-row";
import { RecentSales } from "./recent-sales";

const periods = ["7d", "30d", "90d", "all"] as const;
const days = { "7d": 7, "30d": 30, "90d": 90, all: null } as const;
const dayMs = 86_400_000;
const testnetStart = "2025-12-16T00:00:00.000Z";

export function OverviewPage() {
  const params = useQueryParams();
  const now = useNow();
  const [anchor] = useState(() => Date.now());
  const period = pick(params.get("period"), periods, "30d");
  const span = days[period];
  const me = useClientQuery("merchants.me", {});
  const mine = useClientQuery("campaigns.mine", {}, { refetchInterval: 20_000 });
  const vault = useClientQuery("vault.get", {}, { refetchInterval: 15_000 });
  const analytics = useClientQuery("analytics.merchant", {
    range: {
      from: span === null ? testnetStart : new Date(anchor - span * dayMs).toISOString(),
      to: new Date(anchor + dayMs).toISOString(),
    },
  });
  const rows = mine.data?.items ?? [];
  const totals = vault.data?.totals[0];
  const buckets = totals ? rewardBuckets(totals.rewards) : null;
  const count = (tab: string) => rows.filter((row) => listTabOf(row) === tab).length;
  return (
    <ProductPage
      title={copy.title}
      description={me.data ? fill(copy.description, { name: me.data.name }) : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {me.data ? (
            <Link
              href={routeTo.merchant(me.data.slug)}
              className="text-ink text-sm underline-offset-2 hover:underline"
            >
              {copy.publicPage}
            </Link>
          ) : null}
          <Select
            value={period}
            onValueChange={(value) => {
              params.set({ period: value === "30d" ? null : value });
            }}
            className="w-36!"
            options={periods.map((value) => ({ value, label: copy.periods[value] }))}
          />
        </div>
      }
    >
      <QueryState pending={mine.isPending} error={mine.error} retry={() => void mine.refetch()}>
        <div className="space-y-6">
          <SetupChecklist campaigns={rows} />
          <OverviewAlerts campaigns={rows} now={now} />
          <KpiRow
            totals={
              analytics.data
                ? {
                    value: BigInt(analytics.data.totals.value),
                    rewards: BigInt(analytics.data.totals.rewards),
                  }
                : null
            }
            obligations={
              buckets
                ? { reserved: buckets.pendingReserved, owed: buckets.vestedUnclaimed }
                : vault.data
                  ? { reserved: 0n, owed: 0n }
                  : null
            }
            health={rows.flatMap((row) =>
              row.campaignId === null
                ? []
                : [
                    {
                      stateKey: merchantRowStateKey(row),
                      available: BigInt(row.availableRewards),
                      rewardPerSale: BigInt(row.rewardPerSale),
                      alertSales: row.budgetAlertSales,
                    },
                  ],
            )}
            counts={{
              live: count("live"),
              paused: count("paused"),
              drafts: count("drafts"),
              ended: count("ended"),
            }}
          />
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <RecentSales now={now} />
            </div>
            <CampaignSnapshot rows={rows} />
          </div>
        </div>
      </QueryState>
    </ProductPage>
  );
}
