import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cx } from "./cx";

export type EmptyStateVariant = "page" | "section" | "compact" | "gate";

const layouts = {
  page: "min-h-[50vh] gap-4 px-6 py-16",
  section: "gap-3 px-6 py-12",
  compact: "gap-2 px-4 py-8",
  gate: "min-h-[40vh] gap-4 px-6 py-16",
} as const;

export function EmptyState({
  variant = "section",
  icon,
  illustration,
  chip,
  title,
  body,
  actions,
  className,
}: {
  variant?: EmptyStateVariant;
  icon?: IconSvgElement;
  illustration?: ReactNode;
  chip?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
}) {
  const headingClass =
    variant === "compact"
      ? "font-ui text-ink text-base font-medium"
      : "font-display text-ink text-h4 font-medium tracking-[-0.01em]";
  return (
    <div
      className={cx(
        "font-ui flex flex-col items-center justify-center text-center",
        layouts[variant],
        className,
      )}
    >
      {illustration && variant !== "compact" ? (
        <div aria-hidden="true" className="mb-2 flex justify-center">
          {illustration}
        </div>
      ) : icon ? (
        <span
          aria-hidden="true"
          className="bg-pill text-ink flex size-12 items-center justify-center rounded-full"
        >
          <HugeiconsIcon icon={icon} size={22} strokeWidth={1.8} />
        </span>
      ) : null}
      {chip}
      {variant === "page" || variant === "gate" ? (
        <h1 className={headingClass}>{title}</h1>
      ) : (
        <h2 className={headingClass}>{title}</h2>
      )}
      {body ? <p className="text-subtle max-w-[46ch] text-base">{body}</p> : null}
      {actions ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
