import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { flowCopy } from "./copy";

export function FlowProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  const done = current >= steps.length;
  const label = done
    ? flowCopy.complete
    : fill(flowCopy.step, {
        n: String(current + 1),
        total: String(steps.length),
        name: steps[current] ?? "",
      });
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-subtle text-sm" aria-live="polite">
        {label}
      </p>
      <ol className="flex gap-1.5" aria-label={label}>
        {steps.map((step, index) => (
          <li key={step} className="bg-pill relative h-1.5 flex-1 overflow-hidden rounded-full">
            <span className="sr-only">
              {step}
              {index < current
                ? ` · ${flowCopy.done}`
                : index === current
                  ? ` · ${flowCopy.now}`
                  : ""}
            </span>
            <span
              aria-hidden="true"
              className={cx(
                "bg-lime ease-spring absolute inset-0 origin-left rounded-full transition-transform duration-[423ms]",
                index <= current ? "scale-x-100" : "scale-x-0",
              )}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
