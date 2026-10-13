import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export function Collapsible({
  title,
  id,
  defaultOpen = false,
  level = "section",
  children,
}: {
  title: ReactNode;
  id?: string;
  defaultOpen?: boolean;
  level?: "section" | "row";
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cx(
        "group scroll-mt-24",
        level === "section" ? "bg-surface border-hairline rounded-2xl border" : "",
      )}
    >
      <summary
        className={cx(
          "text-ink flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden",
          level === "section"
            ? "font-display text-h4 px-6 py-5 font-medium lg:px-8"
            : "py-3.5 text-base font-medium",
        )}
      >
        {title}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={20}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-subtle ease-spring shrink-0 transition-transform duration-[423ms] group-open:rotate-180"
        />
      </summary>
      <div className={level === "section" ? "px-6 pb-6 lg:px-8" : "pb-4"}>{children}</div>
    </details>
  );
}
