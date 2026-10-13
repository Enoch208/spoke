import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

const tones = {
  info: { box: "bg-sky-soft", text: "text-sky-ink", icon: InformationCircleIcon },
  caution: { box: "bg-amber-soft", text: "text-amber-ink", icon: Alert02Icon },
  danger: { box: "bg-pink-soft", text: "text-pink-ink", icon: Alert02Icon },
  success: { box: "bg-lime-soft", text: "text-olive", icon: CheckmarkCircle02Icon },
  neutral: { box: "bg-soft", text: "text-ink", icon: InformationCircleIcon },
} as const satisfies Record<string, { box: string; text: string; icon: IconSvgElement }>;

export type CalloutTone = keyof typeof tones;

export function Callout({
  tone,
  title,
  icon,
  children,
  actions,
  className,
}: {
  tone: CalloutTone;
  title?: ReactNode;
  icon?: IconSvgElement;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
}) {
  const look = tones[tone];
  return (
    <div className={cx("font-ui flex gap-3 rounded-xl px-4 py-3", look.box, className)}>
      <HugeiconsIcon
        icon={icon ?? look.icon}
        size={18}
        strokeWidth={1.8}
        aria-hidden="true"
        className={cx("mt-0.5 shrink-0", look.text)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        {title ? <p className={cx("font-medium", look.text)}>{title}</p> : null}
        {children ? <div className="text-body">{children}</div> : null}
        {actions ? <div className="mt-1.5 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
