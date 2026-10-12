import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cx } from "./cx";
import { toneClasses, type Tone } from "./tone";

const sizes = {
  sm: { box: "h-6 gap-1 px-2", icon: 14 },
  md: { box: "h-7 gap-1.5 px-2.5", icon: 16 },
} as const;

export function StatusChip({
  label,
  icon,
  tone,
  size = "sm",
  className,
}: {
  label: string;
  icon: IconSvgElement;
  tone: Tone;
  size?: keyof typeof sizes;
  className?: string | undefined;
}) {
  return (
    <span
      className={cx(
        "font-ui ease-spring inline-flex shrink-0 items-center rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-[423ms]",
        sizes[size].box,
        toneClasses[tone].fill,
        toneClasses[tone].text,
        className,
      )}
    >
      <HugeiconsIcon icon={icon} size={sizes[size].icon} strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
