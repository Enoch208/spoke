import { cx } from "@/components/ui/cx";
import { shareOf } from "./ledger";

export type BarSegment = {
  key: string;
  label: string;
  value: bigint;
  swatch: string;
  amount: string;
  explainer?: string;
};

export function BucketBar({
  segments,
  total,
  label,
}: {
  segments: readonly BarSegment[];
  total: bigint;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="bg-pill flex h-3 w-full overflow-hidden rounded-full"
    >
      {segments.map((segment) =>
        segment.value > 0n ? (
          <span
            key={segment.key}
            className={cx("h-full border-r-2 border-surface last:border-r-0", segment.swatch)}
            style={{ width: `${String(Math.max(shareOf(segment.value, total), 1))}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

export function BucketLegend({ segments }: { segments: readonly BarSegment[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
      {segments.map((segment) => (
        <li key={segment.key} className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden="true"
            className={cx("mt-1.5 size-2.5 shrink-0 rounded-full", segment.swatch)}
          />
          <div className="min-w-0">
            <p className="text-subtle text-sm">{segment.label}</p>
            <p className="text-ink font-mono text-base tabular-nums">{segment.amount}</p>
            {segment.explainer ? (
              <p className="text-subtle mt-0.5 text-xs leading-relaxed">{segment.explainer}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
