"use client";

import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LoadingSkeleton } from "@/components/product/page";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { networkCopy as copy } from "../copy/campaign";

export function NetworkTab({ campaignId }: { campaignId: string }) {
  const stats = useClientQuery("campaigns.stats", { campaignId });
  const data = stats.data;
  if (stats.isPending) return <LoadingSkeleton shape="detail" />;
  const peak = Math.max(1, ...(data?.depthMix.map((row) => row.sales) ?? []));
  const open = (
    <Button asChild>
      <Link href={routeTo.campaignNetwork(campaignId)}>
        {copy.open}
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
      </Link>
    </Button>
  );
  if (!data || data.links === 0)
    return (
      <Card>
        <EmptyState icon={UserGroupIcon} title={copy.empty} actions={open} />
      </Card>
    );
  return (
    <div className="space-y-6">
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[60ch]">
            <h2 className="font-display text-h4 text-ink font-medium">{copy.title}</h2>
            <p className="text-body mt-1 text-sm">{copy.body}</p>
          </div>
          {open}
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { key: "links", label: copy.links, value: data.links },
            { key: "branches", label: copy.branches, value: data.branches },
            { key: "deepest", label: copy.deepest, value: data.deepestLevel },
          ].map((item) => (
            <div key={item.key} className="bg-soft rounded-xl px-4 py-3">
              <dt className="text-subtle text-sm">{item.label}</dt>
              <dd className="text-ink mt-1 font-mono text-xl tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
        {data.depthMix.length > 0 ? (
          <div>
            <h3 className="text-ink mb-3 text-sm font-medium">{copy.depthMix}</h3>
            <ul className="space-y-2">
              {data.depthMix.map((row) => (
                <li key={row.level} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3">
                  <span className="text-subtle text-sm">
                    {fill(copy.depthRow, { n: String(row.level) })}
                  </span>
                  <ProgressBar
                    value={row.sales}
                    max={peak}
                    label={fill(copy.depthRow, { n: String(row.level) })}
                    tone="lime"
                  />
                  <span className="text-ink text-right font-mono text-sm tabular-nums">
                    {row.sales}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
      <p className="text-subtle text-sm">{copy.footnote}</p>
    </div>
  );
}
