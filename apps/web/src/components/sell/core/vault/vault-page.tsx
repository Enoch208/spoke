"use client";

import { MoneyBag02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TabList, Tabs } from "@/components/ui/tabs";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { useClientQuery } from "@/lib/query/use-client";
import { useChainAction } from "@/lib/tx/use-action";
import { vaultCopy as copy } from "../copy/vault";
import { useCampaignNames } from "../shared/hooks";
import { proceedsBuckets, rewardBuckets } from "../shared/ledger";
import { MovementsLedger } from "../shared/movements-ledger";
import { ProceedsCard } from "../shared/proceeds-card";
import { openClaimProceeds } from "../shared/settle";
import { VaultBuckets } from "../shared/vault-buckets";
import { AddBudgetMenu } from "./add-budget-menu";
import { CampaignBudgets, type BudgetRow } from "./campaign-budgets";
import { WalletCard } from "./wallet-card";

export function VaultPage() {
  const vault = useClientQuery("vault.get", {}, { refetchInterval: 15_000 });
  const { mine, names } = useCampaignNames();
  const start = useChainAction();
  const [picked, setPicked] = useState<string | null>(null);
  const totals = vault.data?.totals ?? [];
  const tokenKey = picked ?? totals[0]?.token.address ?? "";
  const total = totals.find((row) => row.token.address === tokenKey) ?? totals[0];
  const entries = (vault.data?.campaigns ?? []).filter(
    (entry) => entry.token.address === total?.token.address,
  );
  const rows: BudgetRow[] = entries.map((entry) => {
    const row = mine.data?.items.find((item) => item.campaignId === entry.campaignId);
    return {
      entry,
      name: row?.productTitle ?? `Campaign #${entry.campaignId}`,
      stateKey: row ? merchantRowStateKey(row) : "live",
    };
  });
  const readyToFinalize = entries.reduce(
    (count, entry) => count + entry.settledSalesReadyToFinalize.length,
    0,
  );
  return (
    <ProductPage title={copy.title} description={copy.description} actions={<AddBudgetMenu />}>
      <QueryState
        pending={vault.isPending}
        error={vault.error}
        retry={() => void vault.refetch()}
        loading="detail"
      >
        {!total ? (
          <Card>
            <EmptyState
              icon={MoneyBag02Icon}
              title={copy.emptyTitle}
              body={copy.emptyBody}
              actions={
                <Button asChild>
                  <Link href="/sell/campaigns/new">{copy.newCampaign}</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {totals.length > 1 ? (
              <Tabs
                value={total.token.address}
                values={totals.map((row) => row.token.address)}
                onValueChange={setPicked}
              >
                <TabList
                  label="Token"
                  value={total.token.address}
                  items={totals.map((row) => ({
                    value: row.token.address,
                    label: row.token.symbol,
                  }))}
                />
              </Tabs>
            ) : null}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <VaultBuckets
                  buckets={rewardBuckets(total.rewards)}
                  token={total.token}
                  indexedBlock={vault.data?.lastIndexedBlock}
                  context="/sell/vault"
                />
              </div>
              <WalletCard token={total.token} />
            </div>
            <CampaignBudgets
              rows={rows}
              totals={rewardBuckets(total.rewards)}
              token={total.token}
            />
            <ProceedsCard
              buckets={proceedsBuckets(total.proceeds)}
              token={total.token}
              readyToFinalize={readyToFinalize}
              onClaim={() => {
                openClaimProceeds(entries, start, (id) => names.get(id) ?? null);
              }}
            />
            <MovementsLedger names={names} />
          </div>
        )}
      </QueryState>
    </ProductPage>
  );
}
