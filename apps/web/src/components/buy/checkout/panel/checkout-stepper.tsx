import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { checkoutCopy } from "../../copy/checkout";

export function CheckoutStepper({ current }: { current: number }) {
  return (
    <ol aria-label={checkoutCopy.pageLabel} className="grid grid-cols-5 gap-1">
      {checkoutCopy.steps.map((label, index) => {
        const state = index < current ? "done" : index === current ? "current" : "upcoming";
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cx(
                  "ease-spring absolute top-3.5 right-[calc(50%+18px)] left-[calc(-50%+14px)] h-px transition-colors duration-[423ms]",
                  index <= current ? "bg-ink/30" : "bg-line",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cx(
                "ease-spring relative flex size-7 items-center justify-center rounded-full font-mono text-sm transition-colors duration-[423ms]",
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
                "text-sm",
                state === "upcoming" ? "text-subtle" : "text-ink font-medium",
              )}
            >
              {label}
              {state === "done" ? <span className="sr-only"> · done</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
