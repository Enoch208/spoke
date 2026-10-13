"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { overviewPageCopy } from "../copy/overview";
import type { MerchantCampaignRow } from "../shared/campaign-rules";

const copy = overviewPageCopy.checklist;

type Item = { key: string; label: string; done: boolean; href?: string; run?: () => void };

export function SetupChecklist({ campaigns }: { campaigns: readonly MerchantCampaignRow[] }) {
  const products = useClientQuery("products.list", { limit: 1 });
  const funding = useClientQuery("funding.status", {});
  if (products.isPending || funding.isPending) return null;
  const launched = campaigns.filter(
    (row) => row.campaignId !== null && row.state !== "CREATED_UNFUNDED",
  );
  const sales = campaigns.reduce(
    (sum, row) => sum + row.sales.pending + row.sales.finalized + row.sales.refunded,
    0,
  );
  const items: Item[] = [
    { key: "business", label: copy.business, done: true },
    {
      key: "product",
      label: copy.product,
      done: (products.data?.items.length ?? 0) > 0,
      href: "/sell/products/new",
    },
    {
      key: "funds",
      label: copy.funds,
      done: BigInt(funding.data?.sdusd ?? "0") > 0n || launched.length > 0,
      run: () => useUiStore.getState().open("M-06", { context: "sellChecklist" }),
    },
    {
      key: "launch",
      label: copy.launch,
      done: launched.length > 0,
      href: "/sell/campaigns/new",
    },
    {
      key: "invite",
      label: copy.invite,
      done: campaigns.some((row) => row.links > 0),
      href: "/sell/campaigns",
    },
    { key: "sale", label: copy.sale, done: sales > 0, href: "/sell/campaigns" },
    {
      key: "settle",
      label: copy.settle,
      done: campaigns.some((row) => row.sales.finalized > 0),
      href: "/sell/sales?state=pending",
    },
  ];
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return null;
  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.title}</h2>
        <span className="text-subtle text-sm">
          {fill(copy.progress, { done: String(done), total: String(items.length) })}
        </span>
      </div>
      <ProgressBar value={done} max={items.length} label={copy.title} tone="lime" />
      <ol className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 py-1">
            <span
              className={cx(
                "flex items-center gap-2 text-sm",
                item.done ? "text-subtle" : "text-ink",
              )}
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
                className={item.done ? "text-lime-ink" : "text-faint"}
              />
              {item.label}
              <span className="sr-only">· {item.done ? copy.done : copy.todo}</span>
            </span>
            {item.done ? null : item.href ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={item.href}>{copy.start}</Link>
              </Button>
            ) : item.run ? (
              <Button size="sm" variant="secondary" onClick={item.run}>
                {copy.start}
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}
