"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fill } from "@/lib/copy";
import { composerCopy } from "./copy";
import type { StepKey } from "./fields";

const copy = composerCopy.rail;

export type RailStep = {
  readonly key: StepKey;
  readonly state: "current" | "done" | "error" | "locked" | "open";
  readonly errors: number;
};

export function StepRail({
  steps,
  onSelect,
}: {
  steps: readonly RailStep[];
  onSelect: (key: StepKey) => void;
}) {
  return (
    <nav aria-label={copy.label} className="hidden lg:block">
      <ol className="sticky top-24 flex flex-col gap-1">
        {steps.map((step, index) => {
          const locked = step.state === "locked";
          return (
            <li key={step.key}>
              <button
                type="button"
                disabled={locked}
                title={locked ? copy.locked : undefined}
                aria-current={step.state === "current" ? "step" : undefined}
                onClick={() => {
                  onSelect(step.key);
                }}
                className={cx(
                  "ease-spring flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors duration-[423ms]",
                  step.state === "current"
                    ? "bg-pill text-ink font-medium"
                    : "text-body hover:bg-pill/60",
                  locked && "text-faint hover:bg-transparent",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-sm",
                    step.state === "current" && "bg-ink text-page",
                    step.state === "done" && "bg-lime-soft text-lime-ink",
                    step.state === "error" && "bg-pink-soft text-pink-ink",
                    (step.state === "open" || locked) && "bg-soft text-subtle",
                  )}
                >
                  {step.state === "done" ? (
                    <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0 flex-1">{composerCopy.steps[step.key]}</span>
                {step.errors > 0 && step.state !== "current" ? (
                  <span className="bg-pink-soft text-pink-ink inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-full px-1.5 font-mono text-xs">
                    <span aria-hidden="true" className="bg-pink-deep size-1.5 rounded-full" />
                    {step.errors}
                    <span className="sr-only">
                      {fill(copy.errors, { count: String(step.errors) })}
                    </span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PhoneProgress({ steps }: { steps: readonly RailStep[] }) {
  const index = Math.max(
    0,
    steps.findIndex((step) => step.state === "current"),
  );
  const current = steps[index];
  if (!current) return null;
  const text = fill(copy.progress, {
    current: String(index + 1),
    total: String(steps.length),
    label: composerCopy.steps[current.key],
  });
  return (
    <div className="flex flex-col gap-2 lg:hidden">
      <p className="text-ink text-sm font-medium">{text}</p>
      <ProgressBar value={index + 1} max={steps.length} label={text} />
    </div>
  );
}
