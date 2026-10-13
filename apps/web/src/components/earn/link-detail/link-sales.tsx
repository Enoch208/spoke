"use client";

import type { ClientOutput } from "@spoke/protocol";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ShowMore } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { LoadingSkeleton } from "@/components/product/page";
import { earningsBucketCopy, missedReasonCopy } from "@/lib/copy";
import { shareBucket, type ShareBucket } from "@/lib/domain/sale-state";
import { formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { linkDetailCopy } from "../copy/link-detail";
import { earningsCopy } from "../copy/earnings";
import type { LinkRow } from "../shared/campaigns";
import { ConversionRow } from "../shared/conversion-row";
import { DialogError } from "../shared/dialog-states";
import { Section } from "../shared/section";

const copy = linkDetailCopy.sales;
type SaleMiss = Extract<ClientOutput<"earnings.missed">["items"][number], { kind: "sale" }>;
const buckets: readonly ShareBucket[] = [
  "atRisk",
  "readyToFinalize",
  "claimable",
  "claimed",
  "refunded",
  "reversed",
];

export function LinkSales({ link }: { link: LinkRow }) {
  const now = useNow();
  const open = useUiStore((state) => state.open);
  const [state, setState] = useState<ShareBucket | "all">("all");
  const [count, setCount] = useState(10);
  const sales = useClientQuery("earnings.byConversion", { nodeId: link.nodeId, limit: 50 });
  const missed = useClientQuery("earnings.missed", { nodeId: link.nodeId, limit: 50 });
  const rows = (sales.data?.items ?? []).filter(
    (row) => state === "all" || shareBucket(row.state, row.unlockAt, new Date(now)) === state,
  );
  const unpaid = (missed.data?.items ?? []).filter((row): row is SaleMiss => row.kind === "sale");
  return (
    <Section
      title={copy.title}
      actions={
        <div className="w-full sm:w-48">
          <Select
            value={state}
            onValueChange={setState}
            options={[
              { value: "all", label: copy.all },
              ...buckets.map((bucket) => ({
                value: bucket,
                label: earningsBucketCopy[bucket].label,
              })),
            ]}
          />
        </div>
      }
    >
      {sales.isPending ? <LoadingSkeleton shape="rows" /> : null}
      {sales.error ? <DialogError error={sales.error} retry={() => void sales.refetch()} /> : null}
      {sales.data && rows.length === 0 ? <EmptyState variant="compact" title={copy.empty} /> : null}
      {rows.length > 0 ? (
        <ul className="divide-hairline -mx-3 divide-y">
          {rows.slice(0, count).map((row) => (
            <ConversionRow
              key={`${row.saleId}-${String(row.level)}`}
              row={row}
              campaign={link.campaign}
              now={now}
            />
          ))}
        </ul>
      ) : null}
      {rows.length > count ? (
        <ShowMore
          onClick={() => {
            setCount(count + 20);
          }}
        />
      ) : null}
      {unpaid.length > 0 && state === "all" ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-ink text-sm font-medium">{copy.notEarned}</h3>
          <ul className="bg-soft divide-hairline divide-y rounded-xl px-4">
            {unpaid.map((row) => (
              <li
                key={row.saleId}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="text-body inline-flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={InformationCircleIcon}
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  #{row.saleId} · {missedReasonCopy[row.reason].label}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-subtle">{formatDateTime(new Date(row.at))}</span>
                  <button
                    type="button"
                    className="text-ink cursor-pointer underline underline-offset-2"
                    onClick={() => open("M-16", { saleId: row.saleId })}
                  >
                    {earningsCopy.missed.seePath}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
