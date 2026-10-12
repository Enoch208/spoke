import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { toneClasses, type Tone } from "./tone";

export function Badge({
  children,
  tone = "faint",
  icon,
  dot = false,
  outline = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: IconSvgElement;
  dot?: boolean;
  outline?: boolean;
  className?: string | undefined;
}) {
  return (
    <span
      className={cx(
        "font-ui inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-medium whitespace-nowrap",
        outline
          ? cx("border border-line bg-transparent", toneClasses[tone].text)
          : cx(toneClasses[tone].fill, toneClasses[tone].text),
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {icon ? <HugeiconsIcon icon={icon} size={14} strokeWidth={2} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
