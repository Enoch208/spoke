import Link from "next/link";
import type { ReactNode } from "react";
import { shellCopy } from "@/lib/copy";

export type Breadcrumb = { label: string; href: string };

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  chips,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: readonly Breadcrumb[];
  actions?: ReactNode;
  chips?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs.length > 0 ? (
          <nav aria-label={shellCopy.breadcrumb} className="font-ui text-subtle mb-2 text-sm">
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumbs.map((crumb) => (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  <Link href={crumb.href} className="hover:text-ink">
                    {crumb.label}
                  </Link>
                  <span aria-hidden="true">/</span>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 tabIndex={-1} className="font-display text-h4 font-medium">
            {title}
          </h1>
          {chips}
        </div>
        {description ? <p className="font-ui text-subtle mt-2 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
