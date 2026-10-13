"use client";

import { Alert01Icon, ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { previewCopy } from "./copy-preview";
import { referenceVectors } from "./reference";

const copy = previewCopy.how;
export function ReferenceChecks() {
  return (
    <details className="group border-hairline rounded-2xl border bg-surface">
      <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
        {copy.title}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="ease-spring transition-transform duration-[423ms] group-open:rotate-180"
        />
      </summary>
      <div className="border-hairline flex flex-col gap-3 border-t px-4 py-3">
        <p className="text-body text-sm">{copy.body}</p>
        <div>
          <p className="text-ink text-sm font-medium">{copy.checks}</p>
          <p className="text-subtle text-sm">{copy.checksHelper}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {referenceVectors().map((vector) => {
            const matches = vector.actual === vector.expected;
            return (
              <li key={vector.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body text-sm">{vector.label}</span>
                  <StatusChip
                    label={matches ? copy.matches : copy.failed}
                    icon={matches ? Tick02Icon : Alert01Icon}
                    tone={matches ? "lime" : "pink"}
                  />
                </div>
                <span className="text-ink font-mono text-sm tabular-nums">{vector.actual}</span>
                {matches ? null : (
                  <span className="text-pink-ink text-sm">
                    {fill(copy.expected, { expected: vector.expected })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
