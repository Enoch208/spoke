import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "./cx";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      className={cx("shrink-0 animate-spin motion-reduce:animate-none", className)}
    />
  );
}
