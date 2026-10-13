"use client";

import Link from "next/link";
import type { TokenLike } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { fill, type CampaignStateKey } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";
import { budgetTabCopy as copy } from "../copy/campaign";
import { Callout } from "../shared/callout";
import { canTopUp, canWithdraw, isRunning } from "../shared/campaign-rules";
import { proceedsBuckets, rewardBuckets, type VaultCampaign } from "../shared/ledger";
import { MovementsLedger } from "../shared/movements-ledger";
import { ProceedsCard } from "../shared/proceeds-card";
import { openClaimProceeds } from "../shared/settle";
import { VaultBuckets } from "../shared/vault-buckets";

export function BudgetTab({
  entry,
  token,
  stateKey,
  name,
  alertSales,
  indexedBlock,
}: {
  entry: VaultCampaign;
  token: TokenLike;
  stateKey: CampaignStateKey;
  name: string;
  alertSales: number | null;
  indexedBlock: string | null | undefined;
}) {
  const ui = useUiStore.getState;
  const buckets = rewardBuckets(entry.rewards);
  const campaignId = entry.campaignId;
  return (
    <div className="space-y-6">
      {isRunning(stateKey) ? (
        <Callout
          tone="lock"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                ui().open("M-25", { campaignId, mode: "pause" });
              }}
            >
              {copy.pauseCampaign}
            </Button>
          }
        >
          {copy.pauseToWithdraw}
        </Callout>
      ) : null}
      <VaultBuckets
        buckets={buckets}
        token={token}
        liabilityCap={BigInt(entry.liabilityCap)}
        indexedBlock={indexedBlock}
        context={`/sell/campaigns/${campaignId}?tab=budget`}
        actions={
          <>
            {canTopUp(stateKey) ? (
              <Button
                variant="secondary"
                onClick={() => {
                  ui().open("M-23", { campaignId });
                }}
              >
                {copy.addBudget}
              </Button>
            ) : null}
            {canWithdraw(stateKey, buckets.available) ? (
              <Button
                variant="secondary"
                onClick={() => {
                  ui().open("M-24", { campaignId });
                }}
              >
                {copy.withdraw}
              </Button>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-subtle">
          {alertSales === null ? null : fill(copy.alert, { n: String(alertSales) })}
        </p>
        <Link href="/sell/vault" className="text-ink underline-offset-2 hover:underline">
          {copy.openVault}
        </Link>
      </div>
      <ProceedsCard
        buckets={proceedsBuckets(entry.proceeds)}
        token={token}
        readyToFinalize={entry.settledSalesReadyToFinalize.length}
        onClaim={() => {
          openClaimProceeds([entry]);
        }}
      />
      <MovementsLedger campaignId={campaignId} names={new Map([[campaignId, name]])} />
    </div>
  );
}
