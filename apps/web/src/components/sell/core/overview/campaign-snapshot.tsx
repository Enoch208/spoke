"use client";

import Link from "next/link";
import { CampaignStateKeyChip } from "@/components/product/campaign-state-chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fill } from "@/lib/copy";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { routeTo } from "@/lib/routes";
import { campaignsCopy } from "../copy/campaigns";
import { overviewPageCopy as copy } from "../copy/overview";
import { coveredText } from "../campaigns/campaign-view";
import type { MerchantCampaignRow } from "../shared/campaign-rules";
import { isExhausted, isLowBudget, shareOf } from "../shared/ledger";

const shown = new Set(["live", "exhausted", "paused"]);

export function CampaignSnapshot({ rows }: { rows: readonly MerchantCampaignRow[] }) {
  const list = rows
    .flatMap((row) => (row.campaignId === null ? [] : [{ ...row, campaignId: row.campaignId }]))
    .filter((row) => shown.has(merchantRowStateKey(row)))
    .slice(0, 5);
  return (
    <Card padding="none" className="overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.snapshot}</h2>
        <Link
          href="/sell/campaigns"
          className="text-ink text-sm underline-offset-2 hover:underline"
        >
          {copy.seeAllCampaigns}
        </Link>
      </header>
      {list.length === 0 ? (
        <EmptyState
          variant="compact"
          title={copy.snapshotEmpty}
          actions={
            <Button asChild size="sm">
              <Link href="/sell/campaigns/new">{copy.launchFirst}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-hairline divide-y">
          {list.map((row) => {
            const available = BigInt(row.availableRewards);
            const reward = BigInt(row.rewardPerSale);
            const tone = isExhausted(available, reward)
              ? "pink"
              : isLowBudget(available, reward, row.budgetAlertSales)
                ? "amber"
                : "lime";
            return (
              <li key={row.campaignId}>
                <Link
                  href={routeTo.sellCampaign(row.campaignId)}
                  className="hover:bg-soft ease-spring block space-y-2 px-5 py-3 transition-colors duration-[423ms]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-ink min-w-0 truncate text-sm font-medium">
                      {row.productTitle}
                    </span>
                    <CampaignStateKeyChip stateKey={merchantRowStateKey(row)} />
                  </div>
                  <ProgressBar
                    value={shareOf(available, BigInt(row.policy.campaignLiabilityCap))}
                    max={100}
                    tone={tone}
                    label={campaignsCopy.budgetBar}
                    className="h-1.5"
                  />
                  <p className="text-subtle flex justify-between gap-3 text-xs">
                    <span>{coveredText(available, reward)}</span>
                    <span>{fill(copy.pending, { n: String(row.pendingSales) })}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
