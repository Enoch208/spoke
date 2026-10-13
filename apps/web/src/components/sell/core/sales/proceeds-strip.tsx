"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModeBadge } from "@/components/ui/mode-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fill, vaultProceedsCopy } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { salesCopy as copy } from "../copy/sales";
import { vaultCopy } from "../copy/vault";
import { useIsDemo } from "../shared/hooks";
import { proceedsBuckets, proceedsKeys } from "../shared/ledger";
import { openClaimProceeds, proceedsCampaigns } from "../shared/settle";

export function ProceedsStrip() {
  const vault = useClientQuery("vault.get", {}, { refetchInterval: 15_000 });
  const demo = useIsDemo();
  const total = vault.data?.totals[0];
  const entries = vault.data?.campaigns ?? [];
  const buckets = total ? proceedsBuckets(total.proceeds) : null;
  const ready = proceedsCampaigns(entries).length > 0;
  const waiting = entries.reduce((n, entry) => n + entry.settledSalesReadyToFinalize.length, 0);
  return (
    <Card padding="none">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-ink font-medium">{copy.proceeds}</h2>
          {demo ? <ModeBadge mode="demo" /> : null}
          <span className="text-subtle text-sm">{copy.proceedsNote}</span>
        </div>
        {total && buckets ? (
          <Button
            size="sm"
            variant={ready ? "primary" : "secondary"}
            disabled={!ready}
            onClick={() => {
              openClaimProceeds(entries);
            }}
          >
            {buckets.proceedsClaimable > 0n
              ? fill(vaultCopy.claim, {
                  amount: formatAmount(buckets.proceedsClaimable, total.token),
                })
              : waiting > 0
                ? fill(vaultCopy.finalizeAndClaim, { n: String(Math.min(waiting, 10)) })
                : vaultCopy.claimIdle}
          </Button>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pt-3 pb-4 lg:grid-cols-4">
        {proceedsKeys.map((key) => (
          <div key={key}>
            <dt className="text-subtle text-sm">{vaultProceedsCopy[key].label}</dt>
            <dd className="text-ink mt-0.5 font-mono tabular-nums">
              {total && buckets ? (
                formatAmount(buckets[key], total.token)
              ) : vault.isPending ? (
                <Skeleton className="h-5 w-28" />
              ) : (
                "—"
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
