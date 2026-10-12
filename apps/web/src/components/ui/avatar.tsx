import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { avatarFor, avatarInitial } from "./avatar-style";
import { cx } from "./cx";

const sizes = {
  xs: { box: "size-6", text: "text-sm", icon: 14 },
  sm: { box: "size-8", text: "text-sm", icon: 16 },
  md: { box: "size-10", text: "text-base", icon: 20 },
  lg: { box: "size-14", text: "text-h4", icon: 28 },
  xl: { box: "size-24", text: "text-h3", icon: 44 },
} as const;

export function Avatar({
  seed,
  name,
  size = "md",
  className,
}: {
  seed: string;
  name?: string | null;
  size?: keyof typeof sizes;
  className?: string | undefined;
}) {
  const initial = avatarInitial({ name });
  return (
    <span
      aria-hidden="true"
      className={cx(
        "font-display inline-flex shrink-0 items-center justify-center rounded-full leading-none font-medium select-none",
        sizes[size].box,
        sizes[size].text,
        avatarFor(seed),
        className,
      )}
    >
      {initial || (
        <HugeiconsIcon
          icon={UserIcon}
          size={sizes[size].icon}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
