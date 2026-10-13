"use client";

import type { ReactNode } from "react";
import { ModeBadge } from "@/components/ui/mode-badge";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useClientContext } from "@/lib/client/provider";
import { feeLine } from "../copy/dialogs";

export function FeeNote() {
  const { mode } = useClientContext();
  return <p className="text-subtle text-sm">{mode === "demo" ? feeLine.demo : feeLine.live}</p>;
}

export function DialogBadge() {
  const { mode } = useClientContext();
  return <ModeBadge mode={mode} />;
}

export function DialogSkeleton() {
  return (
    <div role="status" className="space-y-4 py-2">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <SkeletonText lines={3} />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function LedgerLines({
  rows,
}: {
  rows: readonly { key: string; label: ReactNode; value: ReactNode; text?: boolean }[];
}) {
  return (
    <dl className="border-hairline divide-hairline divide-y rounded-xl border">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <dt className="text-subtle">{row.label}</dt>
          <dd
            className={
              row.text ? "text-ink text-right" : "text-ink text-right font-mono tabular-nums"
            }
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BigAmount({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-soft rounded-xl px-4 py-3">
      <p className="text-subtle text-sm">{label}</p>
      <p className="text-ink mt-1 font-mono text-2xl tabular-nums">{children}</p>
    </div>
  );
}
