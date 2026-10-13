import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

export function SettingsCard({
  title,
  description,
  actions,
  chip,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  chip?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <section className={cx("bg-surface border-hairline rounded-2xl border", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-ink text-h4 font-medium tracking-[-0.01em]">
              {title}
            </h2>
            {chip}
          </div>
          {description ? <p className="text-subtle max-w-[60ch] text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children ? (
        <div className="flex flex-col gap-4 px-5 pt-4 pb-5 sm:px-6 sm:pb-6">{children}</div>
      ) : (
        <div className="pb-5 sm:pb-6" />
      )}
    </section>
  );
}

export function SettingsCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-surface border-hairline rounded-2xl border p-5 sm:p-6" aria-hidden="true">
      <div className="bg-pill h-6 w-40 animate-pulse rounded-lg" />
      <div className="bg-pill mt-2 h-4 w-72 max-w-full animate-pulse rounded-lg" />
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="bg-soft h-10 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
