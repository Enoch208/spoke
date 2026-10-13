"use client";

import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StatusChip } from "@/components/ui/status-chip";
import { earningsBucketCopy } from "@/lib/copy";
import { earningsCopy } from "../copy/earnings";

const flow = ["atRisk", "readyToFinalize", "claimable", "claimed"] as const;
const copy = earningsCopy.move;

function Step({ bucket, arrow }: { bucket: (typeof flow)[number] | "refunded"; arrow: boolean }) {
  const chip = earningsBucketCopy[bucket];
  return (
    <li className="bg-surface border-hairline relative grid min-w-0 content-start gap-2 rounded-2xl border p-4">
      <StatusChip label={chip.label} icon={chip.icon} tone={chip.tone} />
      <p className="text-body text-sm">{copy.steps[bucket]}</p>
      {arrow ? (
        <span
          aria-hidden="true"
          className="bg-pill text-subtle absolute top-1/2 -right-[14px] z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full md:flex"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
        </span>
      ) : null}
    </li>
  );
}

export function HowEarningsMove({ defaultOpen }: { defaultOpen: boolean }) {
  return (
    <details open={defaultOpen} className="group bg-pill rounded-3xl p-2">
      <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-medium">
        {copy.title}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="ease-spring transition-transform duration-[423ms] group-open:rotate-180"
        />
      </summary>
      <div className="grid gap-3 px-1 pt-1 pb-2">
        <ol className="grid gap-3 md:grid-cols-4 md:gap-5">
          {flow.map((bucket, index) => (
            <Step key={bucket} bucket={bucket} arrow={index < flow.length - 1} />
          ))}
        </ol>
        <ol className="grid gap-3 md:grid-cols-4 md:gap-5">
          <Step bucket="refunded" arrow={false} />
        </ol>
        <p className="text-body px-2 text-sm">{copy.motto}</p>
      </div>
    </details>
  );
}
