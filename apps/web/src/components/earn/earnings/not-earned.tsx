"use client";

import type { ClientOutput } from "@spoke/protocol";
import type { ReactNode } from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/product/page";
import { blockedCheckoutReasons, fill, missedReasonCopy, missedSaleReasons } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { earningsCopy } from "../copy/earnings";
import { CampaignName, useMyLinks } from "../shared/campaigns";
import { DialogError } from "../shared/dialog-states";
import type { ClientError } from "@/lib/client/errors";

type Missed = ClientOutput<"earnings.missed">["items"][number];
const copy = earningsCopy.missed;

const explain = (row: Missed) => {
  const reason = missedReasonCopy[row.reason];
  if (row.kind === "blocked_checkout") return reason.explainer;
  if (row.reason === "CAMPAIGN_EXCLUSION" && !row.ruleLabel) return "";
  if (row.reason === "OUTSIDE_DEPTH" && row.position === null) return "";
  return fill(reason.explainer, {
    max: String(row.maxRewardedAncestors),
    position: String(row.position ?? ""),
    ruleLabel: row.ruleLabel ?? "",
  });
};

function Row({ row, children }: { row: Missed; children?: ReactNode }) {
  const links = useMyLinks();
  const open = useUiStore((state) => state.open);
  const reference = row.kind === "sale" ? row.saleId : row.nodeId;
  return (
    <li className="grid gap-2 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <CampaignName campaignId={row.campaignId} known={links.campaignOf(row.campaignId)} />
        <span className="text-subtle">{formatDateTime(new Date(row.at))}</span>
      </div>
      <p className="text-ink flex items-center gap-1.5 text-sm font-medium">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={16}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        {missedReasonCopy[row.reason].label}
      </p>
      {explain(row) ? <p className="text-body text-sm">{explain(row)}</p> : null}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {children}
        <button
          type="button"
          className="text-subtle hover:text-ink cursor-pointer underline-offset-2 hover:underline"
          onClick={() =>
            open("M-41", {
              category: copy.contest,
              context: { kind: row.kind, reference, campaignId: row.campaignId },
            })
          }
        >
          {copy.wrong}
        </button>
      </div>
    </li>
  );
}

export function NotEarned({
  rows,
  pending,
  error,
  retry,
}: {
  rows: readonly Missed[];
  pending: boolean;
  error: ClientError | null;
  retry: () => void;
}) {
  const open = useUiStore((state) => state.open);
  const links = useMyLinks();
  if (pending) return <LoadingSkeleton shape="rows" />;
  if (error) return <DialogError error={error} retry={retry} />;
  const order = [...missedSaleReasons, ...blockedCheckoutReasons] as readonly string[];
  const sorted = [...rows].sort((a, b) => order.indexOf(a.reason) - order.indexOf(b.reason));
  const sales = sorted.filter(
    (row): row is Extract<Missed, { kind: "sale" }> => row.kind === "sale",
  );
  const blocked = sorted.filter((row) => row.kind === "blocked_checkout");
  if (rows.length === 0) return <EmptyState variant="compact" title={copy.empty} />;
  return (
    <div className="grid gap-6">
      <p className="text-body">{copy.intro}</p>
      {sales.length > 0 ? (
        <section className="grid gap-1">
          <h3 className="font-display text-ink text-lg font-medium">{copy.sales}</h3>
          <ul className="divide-hairline divide-y">
            {sales.map((row) => (
              <Row key={`${row.saleId}-${row.nodeId}`} row={row}>
                <span className="text-ink font-medium">#{row.saleId}</span>
                <button
                  type="button"
                  className="text-ink cursor-pointer font-medium underline underline-offset-2"
                  onClick={() => open("M-16", { saleId: row.saleId })}
                >
                  {copy.seePath}
                </button>
              </Row>
            ))}
          </ul>
        </section>
      ) : null}
      {blocked.length > 0 ? (
        <section className="grid gap-1">
          <h3 className="font-display text-ink text-lg font-medium">{copy.blocked}</h3>
          <p className="text-subtle text-sm">{copy.blockedScope}</p>
          <ul className="divide-hairline divide-y">
            {blocked.map((row) => (
              <Row key={`${row.nodeId}-${row.at}`} row={row}>
                <Badge tone="faint">{copy.blockedTag}</Badge>
                <span className="text-subtle">
                  {fill(copy.through, {
                    product: links.campaignOf(row.campaignId)?.product.title ?? `#${row.nodeId}`,
                  })}
                </span>
              </Row>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
