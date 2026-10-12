import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { common, fill } from "@/lib/copy";
import { cx } from "./cx";

export type StepperStep = { key: string; label: ReactNode };

export function Stepper({
  steps,
  current,
  label = common.steps,
  className,
}: {
  steps: readonly StepperStep[];
  current: number;
  label?: string;
  className?: string | undefined;
}) {
  return (
    <div className={cx("font-ui", className)}>
      <p className="text-subtle mb-2 text-sm sm:hidden">
        {fill(common.stepOf, { current: String(current + 1), total: String(steps.length) })}
      </p>
      <ol aria-label={label} className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {steps.map((step, index) => {
          const state = index < current ? "done" : index === current ? "current" : "upcoming";
          return (
            <li
              key={step.key}
              aria-current={state === "current" ? "step" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-2",
                state !== "current" && "max-sm:hidden",
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  "ease-spring flex size-7 items-center justify-center rounded-full font-mono text-sm transition-colors duration-[423ms]",
                  state === "done" && "bg-lime-soft text-lime-ink",
                  state === "current" && "bg-ink text-page",
                  state === "upcoming" && "bg-pill text-subtle",
                )}
              >
                {state === "done" ? (
                  <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cx(
                  "text-sm whitespace-nowrap",
                  state === "upcoming" ? "text-subtle" : "text-ink font-medium",
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 ? (
                <span aria-hidden="true" className="bg-line ml-1 hidden h-px w-6 sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
