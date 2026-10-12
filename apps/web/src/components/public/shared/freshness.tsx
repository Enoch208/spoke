"use client";

import { Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { useClientContext } from "@/lib/client/provider";
import { fill } from "@/lib/copy";
import { formatCount, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { freshnessCopy } from "../copy/shared";

const behindSeconds = 30;

export function FreshnessLine({ className }: { className?: string | undefined }) {
  const { mode } = useClientContext();
  const status = useClientQuery("system.status", {}, { enabled: mode === "live" });
  const indexer = status.data?.indexer;
  if (mode !== "live" || !indexer?.indexedBlock) return null;
  const lag = indexer.lagSeconds ?? 0;
  const behind = lag > behindSeconds;
  return (
    <p
      className={cx(
        "font-ui flex items-center gap-1.5 text-sm",
        behind ? "text-amber-ink" : "text-subtle",
        className,
      )}
    >
      <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.8} aria-hidden="true" />
      {behind
        ? fill(freshnessCopy.behind, { lag: String(Math.round(lag)) })
        : fill(freshnessCopy.indexed, {
            block: formatCount(BigInt(indexer.indexedBlock)),
            relative: formatRelative(new Date(indexer.chainTime)),
          })}
    </p>
  );
}
