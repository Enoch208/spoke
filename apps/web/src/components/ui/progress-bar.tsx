"use client";

import { Progress } from "radix-ui";
import { cx } from "./cx";

export function ProgressBar({
  value,
  max,
  label,
  valueText,
  tone = "ink",
  className,
}: {
  value: number;
  max: number;
  label: string;
  valueText?: string;
  tone?: "ink" | "lime" | "amber" | "pink";
  className?: string | undefined;
}) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <Progress.Root
      value={value}
      max={max}
      aria-label={label}
      {...(valueText ? { getValueLabel: () => valueText } : {})}
      className={cx("bg-pill relative h-2 w-full overflow-hidden rounded-full", className)}
    >
      <Progress.Indicator
        className={cx(
          "ease-spring h-full w-full origin-left rounded-full transition-transform duration-[423ms]",
          tone === "ink" && "bg-ink",
          tone === "lime" && "bg-lime-deep",
          tone === "amber" && "bg-amber-deep",
          tone === "pink" && "bg-pink-deep",
        )}
        style={{ transform: `scaleX(${String(share)})` }}
      />
    </Progress.Root>
  );
}
