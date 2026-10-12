"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModeBadge } from "@/components/ui/mode-badge";
import { fill, vaultProceedsCopy } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { vaultCopy as copy } from "../copy/vault";
import { BucketBar, BucketLegend, type BarSegment } from "./bucket-bar";
import { useIsDemo } from "./hooks";
import { proceedsKeys, proceedsTotal, type ProceedsBuckets } from "./ledger";

const swatches = {
  proceedsPending: "bg-chart-pending",
  proceedsClaimable: "bg-lime",
  proceedsClaimed: "bg-chart-settled",
  buyerRefunded: "bg-chart-refunded",
} as const;

export function ProceedsCard({
  buckets,
  token,
  readyToFinalize,
  onClaim,
  busy = false,
}: {
  buckets: ProceedsBuckets;
  token: TokenLike;
  readyToFinalize: number;
  onClaim: () => void;
  busy?: boolean;
}) {
  const demo = useIsDemo();
  const total = proceedsTotal(buckets);
  const segments: BarSegment[] = proceedsKeys.map((key) => ({
    key,
    label: vaultProceedsCopy[key].label,
    explainer: vaultProceedsCopy[key].explainer,
    value: buckets[key],
    swatch: swatches[key],
    amount: formatAmount(buckets[key], token),
  }));
  const claimable = buckets.proceedsClaimable;
  const canClaim = claimable > 0n || readyToFinalize > 0;
  return (
    <Card padding="lg" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-h4 text-ink font-medium">{copy.proceedsTitle}</h2>
            {demo ? <ModeBadge mode="demo" /> : null}
          </div>
          <p className="text-subtle mt-1 text-sm">{copy.proceedsSubtitle}</p>
        </div>
        <Button
          variant={canClaim ? "primary" : "secondary"}
          disabled={!canClaim}
          loading={busy}
          loadingLabel="Waiting for confirmation…"
          onClick={onClaim}
        >
          {claimable > 0n
            ? fill(copy.claim, { amount: formatAmount(claimable, token) })
            : readyToFinalize > 0
              ? fill(copy.finalizeAndClaim, { n: String(Math.min(readyToFinalize, 10)) })
              : copy.claimIdle}
        </Button>
      </div>
      <BucketBar
        segments={segments}
        total={total}
        label={segments.map((segment) => `${segment.label} ${segment.amount}`).join(", ")}
      />
      <BucketLegend segments={segments} />
      <p className="border-hairline text-body border-t pt-4 font-mono text-xs tabular-nums">
        {proceedsKeys.map((key) => vaultProceedsCopy[key].label).join(" + ")}{" "}
        {fill(copy.proceedsSum, { amount: formatAmount(total, token) })}
      </p>
    </Card>
  );
}
