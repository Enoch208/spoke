import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

const tones = {
  info: { box: "bg-sky-soft text-sky-ink", icon: InformationCircleIcon },
  caution: { box: "bg-amber-soft text-amber-ink", icon: Alert02Icon },
  danger: { box: "bg-pink-soft text-pink-ink", icon: Alert02Icon },
  success: { box: "bg-lime-soft text-lime-ink", icon: CheckmarkCircle02Icon },
  lock: { box: "bg-soft text-ink", icon: SquareLock02Icon },
} as const satisfies Record<string, { box: string; icon: IconSvgElement }>;

export type CalloutTone = keyof typeof tones;

export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cx(
        "font-ui flex flex-col gap-3 rounded-xl px-4 py-3 text-sm sm:flex-row sm:items-center",
        tones[tone].box,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <HugeiconsIcon
          icon={tones[tone].icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="mt-px shrink-0"
        />
        <div className="min-w-0">
          {title ? <p className="font-medium">{title}</p> : null}
          <div className={cx(title ? "mt-0.5 opacity-90" : undefined)}>{children}</div>
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{action}</div> : null}
    </div>
  );
}
