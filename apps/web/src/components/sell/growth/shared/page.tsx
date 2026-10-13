"use client";

import type { ReactNode } from "react";
import { ProductPage, type Crumb } from "@/components/product/page";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { useSignalsStore } from "@/lib/stores/signals";
import { growthCopy } from "./copy";
import { useIsDemo } from "./mode";
import { ViewAsBanner } from "./not-live";

export function GrowthPage({
  title,
  description,
  actions,
  breadcrumbs,
  chip,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  breadcrumbs?: readonly Crumb[];
  chip?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ProductPage
      title={title}
      description={description}
      actions={
        chip || actions ? (
          <>
            {chip}
            {actions}
          </>
        ) : undefined
      }
      {...(breadcrumbs ? { breadcrumbs } : {})}
    >
      <div className="space-y-6">
        <ViewAsBanner />
        {children}
      </div>
    </ProductPage>
  );
}

export function IndexStamp({ className, extra }: { className?: string; extra?: ReactNode }) {
  const demo = useIsDemo();
  const block = useSignalsStore((state) => state.indexedBlock);
  const status = useSignalsStore((state) => state.indexingStatus);
  return (
    <div className={cx("text-subtle space-y-1 text-sm", className)}>
      {extra}
      {demo ? (
        <p>{growthCopy.sampleData}</p>
      ) : block ? (
        <p className="font-mono text-xs tabular-nums">
          {fill(growthCopy.updatedTo, { block: formatCount(BigInt(block)) })}
        </p>
      ) : null}
      {!demo && (status === "syncing" || status === "behind") ? (
        <p className="text-amber-ink">{growthCopy.syncing}</p>
      ) : null}
    </div>
  );
}

export function PhoneActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden="true" className="h-16 lg:hidden" />
      <div className="border-hairline bg-page/95 fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t px-4 py-3 backdrop-blur-[30px] lg:hidden [&>*]:flex-1">
        {children}
      </div>
    </>
  );
}
