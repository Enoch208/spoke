import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ClientError } from "@/lib/client/errors";

export function ProductPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="font-ui mx-auto w-full max-w-[1120px] space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h3 text-ink tracking-tight">{title}</h1>
          {description ? <p className="text-body mt-2 max-w-[65ch]">{description}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function QueryState({
  pending,
  error,
  retry,
  children,
}: {
  pending: boolean;
  error: ClientError | null;
  retry: () => void;
  children: ReactNode;
}) {
  if (pending)
    return (
      <div role="status" className="flex min-h-48 items-center justify-center gap-2">
        <Spinner />
        Loading…
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
