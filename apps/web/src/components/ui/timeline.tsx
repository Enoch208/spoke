import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { toneClasses, type Tone } from "./tone";

export type TimelineItem = {
  key: string;
  title: ReactNode;
  time?: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  icon: IconSvgElement;
  tone: Tone;
};

export function Timeline({
  items,
  label,
  className,
}: {
  items: readonly TimelineItem[];
  label: string;
  className?: string | undefined;
}) {
  return (
    <ol aria-label={label} className={cx("font-ui flex flex-col", className)}>
      {items.map((item, index) => (
        <li key={item.key} className="relative flex gap-3 pb-5 last:pb-0">
          {index < items.length - 1 ? (
            <span aria-hidden="true" className="bg-line absolute top-8 bottom-0 left-[15px] w-px" />
          ) : null}
          <span
            aria-hidden="true"
            className={cx(
              "relative flex size-8 shrink-0 items-center justify-center rounded-full",
              toneClasses[item.tone].fill,
              toneClasses[item.tone].text,
            )}
          >
            <HugeiconsIcon icon={item.icon} size={16} strokeWidth={2} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-ink text-sm font-medium">{item.title}</p>
              {item.time ? <p className="text-subtle text-sm">{item.time}</p> : null}
            </div>
            {item.body ? <div className="text-body text-sm">{item.body}</div> : null}
            {item.meta ? <div className="text-subtle text-sm">{item.meta}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
