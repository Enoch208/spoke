"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModeBadge } from "@/components/ui/mode-badge";
import { fill, vaultRewardCopy } from "@/lib/copy";
import { formatAmount, formatBlock, type TokenLike } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { vaultCopy as copy } from "../copy/vault";
import { BucketBar, BucketLegend, type BarSegment } from "./bucket-bar";
import { Callout } from "./callout";
import { useIsDemo } from "./hooks";
import {
  obligations,
  rewardKeys,
  rewardsAddUp,
  roomUnderLimit,
  type RewardBuckets,
} from "./ledger";

const swatches = {
  available: "bg-lime",
  pendingReserved: "bg-chart-pending",
  vestedUnclaimed: "bg-chart-reserved",
  rewardsClaimed: "bg-chart-settled",
  surplusWithdrawn: "bg-chart-context",
} as const;

export function MismatchState({ context }: { context: string }) {
  return (
    <Callout
      tone="danger"
      action={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            useUiStore.getState().open("M-41", { category: "money", context: { page: context } });
          }}
        >
          {copy.reportProblem}
        </Button>
      }
    >
      {copy.mismatch}
    </Callout>
  );
}

export function VaultBuckets({
  buckets,
  token,
  liabilityCap,
  indexedBlock,
  actions,
  context,
}: {
  buckets: RewardBuckets;
  token: TokenLike;
  liabilityCap?: bigint | undefined;
  indexedBlock?: string | null | undefined;
  actions?: ReactNode;
  context: string;
}) {
  const demo = useIsDemo();
  const segments: BarSegment[] = rewardKeys.map((key) => ({
    key,
    label: vaultRewardCopy[key].label,
    explainer: vaultRewardCopy[key].explainer,
    value: buckets[key],
    swatch: swatches[key],
    amount: formatAmount(buckets[key], token),
  }));
  const owed = obligations(buckets);
  return (
    <Card padding="lg" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-subtle text-sm">{copy.deposited}</p>
            {demo ? <ModeBadge mode="demo" /> : null}
          </div>
          <p className="text-ink mt-1 font-mono text-3xl tabular-nums sm:text-4xl">
            {formatAmount(buckets.netDeposited, token)}
          </p>
          <p className="text-subtle mt-1 text-sm">{copy.testnetToken}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {rewardsAddUp(buckets) ? (
        <>
          <BucketBar
            segments={segments}
            total={buckets.netDeposited}
            label={segments.map((segment) => `${segment.label} ${segment.amount}`).join(", ")}
          />
          <BucketLegend segments={segments} />
          <div className="border-hairline flex flex-col gap-1 border-t pt-4">
            <p className="text-body font-mono text-xs leading-relaxed tabular-nums">
              {copy.sumCheck} · {formatAmount(buckets.netDeposited, token)}
            </p>
            <p className="text-lime-ink flex items-center gap-1.5 text-sm font-medium">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              {copy.addsUp}
              {!demo && indexedBlock ? (
                <span className="text-subtle font-normal">
                  · {fill(copy.indexed, { block: formatBlock(indexedBlock) })}
                </span>
              ) : null}
            </p>
          </div>
        </>
      ) : (
        <MismatchState context={context} />
      )}
      {liabilityCap !== undefined ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="bg-soft rounded-xl px-4 py-3">
            <dt className="text-subtle text-sm">{copy.limit}</dt>
            <dd className="text-ink mt-0.5 font-mono tabular-nums">
              {formatAmount(liabilityCap, token)}
            </dd>
          </div>
          <div className="bg-soft rounded-xl px-4 py-3">
            <dt className="text-subtle text-sm">{copy.room}</dt>
            <dd className="text-ink mt-0.5 font-mono tabular-nums">
              {formatAmount(roomUnderLimit(liabilityCap, buckets), token)}
            </dd>
          </div>
        </dl>
      ) : null}
      {owed > 0n ? (
        <Callout tone="lock">
          {fill(copy.obligations, { amount: formatAmount(owed, token) })}
        </Callout>
      ) : null}
    </Card>
  );
}
