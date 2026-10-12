import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export function Section({
  id,
  title,
  description,
  actions,
  className,
  padding = "md",
  children,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
  padding?: "none" | "md";
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cx(
        "bg-surface border-hairline min-w-0 scroll-mt-24 rounded-2xl border",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">{title}</h2>
          {description ? (
            <p className="text-subtle mt-1 max-w-[70ch] text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cx(padding === "md" ? "p-5" : "pt-3 pb-2")}>{children}</div>
    </section>
  );
}
