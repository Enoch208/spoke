"use client";

import type { ReactNode } from "react";
import { common, fill } from "@/lib/copy";
import { cx } from "./cx";
import { useLoadingPhase } from "./use-loading-phase";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("bg-pill relative block overflow-hidden rounded-md", className)}
    >
      <span className="animate-shimmer via-surface/70 absolute inset-0 bg-gradient-to-r from-transparent to-transparent motion-reduce:hidden" />
    </span>
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <span className={cx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cx("h-[1lh] max-h-4", index === lines - 1 && lines > 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </span>
  );
}

const amountWidths = {
  short: "w-[9ch]",
  medium: "w-[12ch]",
  long: "w-[16ch]",
} as const;

export function SkeletonAmount({
  length = "medium",
  className,
}: {
  length?: keyof typeof amountWidths;
  className?: string | undefined;
}) {
  return (
    <Skeleton
      className={cx(
        "inline-block h-[1lh] max-h-5 align-middle font-mono",
        amountWidths[length],
        className,
      )}
    />
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <span className={cx("flex flex-col", className)}>
      {Array.from({ length: Math.min(rows, 8) }, (_, index) => (
        <span key={index} className="border-hairline flex h-14 items-center gap-4 border-b px-4">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </span>
      ))}
    </span>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cx("h-36 rounded-2xl", className)} />;
}

export function SkeletonChartFrame({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("border-hairline relative block h-60 rounded-2xl border-b border-l", className)}
    />
  );
}

export function LoadingBoundary({
  loading,
  sectionName,
  skeleton,
  onRetry,
  children,
}: {
  loading: boolean;
  sectionName: string;
  skeleton: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}) {
  const phase = useLoadingPhase(loading);
  if (phase === "content" && !loading) return <>{children}</>;
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">{fill(common.loadingSection, { sectionName })}</span>
      {phase === "slow" ? (
        <p className="font-ui text-subtle flex items-center gap-2 text-sm">
          {common.takingLonger}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-ink underline underline-offset-2"
            >
              {common.tryAgain}
            </button>
          ) : null}
        </p>
      ) : null}
      <div className={cx(phase === "hidden" && "invisible")}>{skeleton}</div>
    </div>
  );
}
