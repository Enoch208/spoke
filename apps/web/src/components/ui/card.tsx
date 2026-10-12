import type { ElementType, ReactNode } from "react";
import { cx } from "./cx";

export function Card({
  as: Element = "div",
  padding = "md",
  className,
  children,
}: {
  as?: ElementType;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Element
      className={cx(
        "bg-surface rounded-2xl border border-hairline",
        padding === "sm" && "p-4",
        padding === "md" && "p-5",
        padding === "lg" && "p-6 lg:p-8",
        className,
      )}
    >
      {children}
    </Element>
  );
}

export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}) {
  const hasHeader = Boolean(title) || Boolean(actions);
  return (
    <section className={cx("bg-pill rounded-3xl p-2", className)}>
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3 px-3 pt-2 pb-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? (
              <h2 className="font-display text-ink text-h4 font-medium tracking-[-0.01em]">
                {title}
              </h2>
            ) : null}
            {description ? <p className="font-ui text-subtle text-sm">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
