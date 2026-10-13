"use client";

import {
  ArrowDownRight01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { Sparkline } from "./sparkline";

export type Delta = {
  text: string;
  direction: "up" | "down" | "flat";
  tone: "good" | "bad" | "neutral";
};

const deltaTone = { good: "text-lime-ink", bad: "text-pink-ink", neutral: "text-muted" } as const;
const deltaIcon = {
  up: ArrowUpRight01Icon,
  down: ArrowDownRight01Icon,
  flat: ArrowRight01Icon,
} as const;

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <button
        type="button"
        aria-label={text}
        className="text-faint hover:text-ink inline-flex size-6 items-center justify-center rounded-full"
      >
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  );
}

export function DeltaLine({ delta }: { delta: Delta }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 text-xs sm:text-sm", deltaTone[delta.tone])}
    >
      <HugeiconsIcon
        icon={deltaIcon[delta.direction]}
        size={14}
        strokeWidth={2}
        aria-hidden="true"
      />
      {delta.text}
    </span>
  );
}

export function StatTile({
  label,
  value,
  caption,
  delta,
  trend,
  trendLabel,
  badge,
  tip,
  loading = false,
  className,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  delta?: Delta | null | undefined;
  trend?: readonly bigint[] | undefined;
  trendLabel?: string;
  badge?: ReactNode;
  tip?: string | undefined;
  loading?: boolean;
  className?: string | undefined;
}) {
  return (
    <Card padding="sm" className={cx("flex h-full min-w-0 flex-col gap-1.5 sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-subtle flex items-center gap-0.5 text-sm">
          {label}
          {tip ? <InfoTip text={tip} /> : null}
        </p>
        {badge}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-28" />
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div className="text-ink min-w-0 font-mono text-base tabular-nums [overflow-wrap:anywhere] sm:text-2xl">
            {value}
          </div>
          {trend && trend.length > 1 ? (
            <Sparkline values={trend} label={trendLabel ?? label} width={72} height={26} />
          ) : null}
        </div>
      )}
      {delta && !loading ? <DeltaLine delta={delta} /> : null}
      {caption && !loading ? (
        <div className="text-subtle text-xs leading-relaxed sm:text-sm">{caption}</div>
      ) : null}
    </Card>
  );
}
