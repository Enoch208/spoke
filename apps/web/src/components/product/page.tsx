import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { SkeletonCard, SkeletonRows } from "@/components/ui/skeleton";
import type { ClientError } from "@/lib/client/errors";
import { common, shellCopy } from "@/lib/copy";

export type Crumb = { label: string; href: string };

export function ProductPage({
  title,
  description,
  actions,
  breadcrumbs = [],
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  breadcrumbs?: readonly Crumb[];
  children: ReactNode;
}) {
  return (
    <div className="font-ui w-full space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {breadcrumbs.length > 0 ? (
            <nav aria-label={shellCopy.breadcrumb} className="text-subtle mb-2 text-sm">
              <ol className="flex flex-wrap items-center gap-1.5">
                {breadcrumbs.map((crumb) => (
                  <li key={crumb.href} className="flex items-center gap-1.5">
                    <Link href={crumb.href} className="hover:text-ink transition-colors">
                      {crumb.label}
                    </Link>
                    <span aria-hidden="true" className="text-faint">
                      /
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <h1 className="font-display text-title text-ink font-medium tracking-[-0.02em]">
            {title}
          </h1>
          {description ? <p className="text-body mt-2 max-w-[65ch]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6 lg:py-14">{children}</div>
  );
}

export type LoadingShape = "cards" | "rows" | "detail";

function LoadingSkeleton({ shape }: { shape: LoadingShape }) {
  if (shape === "cards")
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <SkeletonCard key={index} className="h-56" />
        ))}
      </div>
    );
  if (shape === "rows")
    return (
      <Card padding="none" className="overflow-hidden">
        <SkeletonRows rows={6} />
      </Card>
    );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <SkeletonCard key={index} className="h-28" />
        ))}
      </div>
      <SkeletonCard className="h-72" />
    </div>
  );
}

export function QueryState({
  pending,
  error,
  retry,
  loading = "detail",
  children,
}: {
  pending: boolean;
  error: ClientError | null;
  retry: () => void;
  loading?: LoadingShape;
  children: ReactNode;
}) {
  if (pending)
    return (
      <div role="status" aria-live="polite">
        <span className="sr-only">{common.loading}</span>
        <LoadingSkeleton shape={loading} />
      </div>
    );
  if (error)
    return (
      <ErrorState
        title={
          error.code === "NOT_FOUND" ? "This page could not be found" : "This data is unavailable"
        }
        body={error.message}
        details={{ code: error.code, requestId: error.requestId ?? undefined }}
        actions={
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        }
      />
    );
  return children;
}

export function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: ReactNode;
  caption?: string | undefined;
}) {
  return (
    <Card>
      <p className="text-subtle text-sm">{label}</p>
      <p className="font-mono text-ink mt-2 break-words text-2xl tabular-nums">{value}</p>
      {caption ? <p className="text-subtle mt-2 text-sm">{caption}</p> : null}
    </Card>
  );
}

export function PageLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="secondary">
      <Link href={href}>{children}</Link>
    </Button>
  );
}
