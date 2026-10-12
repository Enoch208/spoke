import { cx } from "@/components/ui/cx";
import { formatBps, formatSplit } from "@/lib/format";

export function SplitStrip({
  weightsBps,
  className,
}: {
  weightsBps: readonly number[];
  className?: string | undefined;
}) {
  return (
    <div
      role="img"
      aria-label={`Split nearest first: ${formatSplit(weightsBps)}`}
      className={cx("flex items-end gap-1", className)}
    >
      {weightsBps.map((weight, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-1" style={{ flexGrow: weight }}>
          <span
            aria-hidden="true"
            className={cx("block h-1.5 rounded-full", index === 0 ? "bg-lime" : "bg-olive/25")}
          />
          <span aria-hidden="true" className="text-subtle font-mono text-sm tabular-nums">
            {formatBps(weight).replace("%", "")}
          </span>
        </div>
      ))}
    </div>
  );
}
