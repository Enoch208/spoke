"use client";

import { MoneyReceive01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/product/page";
import { useClientContext } from "@/lib/client/provider";
import { earningsBucketCopy } from "@/lib/copy";
import { formatAmount, formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { earningsCopy } from "../copy/earnings";
import { CampaignName, useMyLinks } from "../shared/campaigns";
import { ConversionRow, cancelled, placeLine, purchasedAt } from "../shared/conversion-row";
import { DialogError } from "../shared/dialog-states";
import { MoneyStateChip } from "../shared/money-state-chip";
import { useCursorPages } from "../shared/use-pages";

const copy = earningsCopy.bySale;
const stateFilters = {
  atRisk: { state: "reserved", holdEnded: false },
  readyToFinalize: { state: "reserved", holdEnded: true },
  claimable: { state: "claimable" },
  claimed: { state: "claimed" },
  refunded: { state: "refunded" },
  reversed: { state: "reversed" },
} as const;
const stateKeys = [
  "atRisk",
  "readyToFinalize",
  "claimable",
  "claimed",
  "refunded",
  "reversed",
] as const satisfies readonly (keyof typeof stateFilters)[];
type StateFilter = keyof typeof stateFilters | "all";

export function BySale({
  campaigns,
}: {
  campaigns: readonly { campaignId: string; productTitle: string }[];
}) {
  const { mode } = useClientContext();
  const now = useNow();
  const open = useUiStore((state) => state.open);
  const links = useMyLinks();
  const pages = useCursorPages();
  const [state, setState] = useState<StateFilter>("all");
  const [campaign, setCampaign] = useState("all");
  const filtered = state !== "all" || campaign !== "all";
  const sales = useClientQuery("earnings.byConversion", {
    limit: 25,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
    ...(state === "all" ? {} : stateFilters[state]),
    ...(campaign === "all" ? {} : { campaignId: campaign }),
  });
  const rows = sales.data?.items ?? [];
  const states = stateKeys.filter((key) => key !== "reversed" || mode === "demo");
  const clear = () => {
    setState("all");
    setCampaign("all");
    pages.reset();
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Select
          className="w-full sm:w-52"
          value={state}
          onValueChange={(value) => {
            setState(value);
            pages.reset();
          }}
          options={[
            { value: "all", label: earningsCopy.filters.allStates },
            ...states.map((key) => ({ value: key, label: earningsBucketCopy[key].label })),
          ]}
        />
        <Select
          className="w-full sm:w-64"
          value={campaign}
          onValueChange={(value) => {
            setCampaign(value);
            pages.reset();
          }}
          options={[
            { value: "all", label: earningsCopy.filters.allCampaigns },
            ...campaigns.map((item) => ({ value: item.campaignId, label: item.productTitle })),
          ]}
        />
      </div>
      {sales.isPending ? <LoadingSkeleton shape="rows" /> : null}
      {sales.error ? <DialogError error={sales.error} retry={() => void sales.refetch()} /> : null}
      {sales.data && rows.length === 0 ? (
        filtered ? (
          <EmptyState
            variant="compact"
            title={earningsCopy.empty.filtered}
            actions={
              <Button size="sm" variant="secondary" onClick={clear}>
                {earningsCopy.filters.clear}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={MoneyReceive01Icon}
            title={earningsCopy.empty.title}
            body={earningsCopy.empty.body}
            actions={
              <Button asChild size="sm">
                <Link href={routes.earn.links}>{earningsCopy.empty.action}</Link>
              </Button>
            }
          />
        )
      ) : null}
      {rows.length > 0 ? (
        <>
          <Table caption={copy.caption} className="max-md:hidden">
            <THead>
              <tr>
                <Th>{copy.date}</Th>
                <Th>{copy.product}</Th>
                <Th>{copy.sale}</Th>
                <Th>{copy.place}</Th>
                <Th numeric>{copy.share}</Th>
                <Th>{copy.state}</Th>
                <Th>{copy.proof}</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => {
                const at = purchasedAt(row);
                return (
                  <Tr key={`${row.saleId}-${String(row.level)}`}>
                    <Td className="text-body whitespace-nowrap">
                      {at ? formatDateTime(new Date(at)) : "—"}
                    </Td>
                    <Td className="max-w-[260px]">
                      <CampaignName
                        campaignId={row.campaignId}
                        known={links.campaignOf(row.campaignId)}
                      />
                    </Td>
                    <Td>
                      <button
                        type="button"
                        className="text-ink cursor-pointer font-medium underline-offset-2 hover:underline"
                        onClick={() => open("M-16", { saleId: row.saleId })}
                      >
                        #{row.saleId}
                      </button>
                    </Td>
                    <Td className="text-body whitespace-nowrap">{placeLine(row)}</Td>
                    <Td numeric className={cx(cancelled(row) && "text-subtle line-through")}>
                      {formatAmount(BigInt(row.amount), row.token)}
                    </Td>
                    <Td>
                      <MoneyStateChip
                        state={row.state}
                        unlockAt={row.unlockAt}
                        finalizedAt={row.finalizedAt}
                        claimTxHash={row.claimTxHash}
                        now={now}
                      />
                    </Td>
                    <Td className="whitespace-nowrap">
                      <Link
                        href={receiptHref(row.saleId, activeChain.id)}
                        className="text-ink text-sm underline-offset-2 hover:underline"
                      >
                        {copy.receipt}
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
          <ul className="divide-hairline -mx-3 divide-y md:hidden">
            {rows.map((row) => (
              <ConversionRow
                key={`${row.saleId}-${String(row.level)}`}
                row={row}
                campaign={links.campaignOf(row.campaignId)}
                now={now}
              />
            ))}
          </ul>
          {pages.hasPrevious || sales.data?.nextCursor ? (
            <Pagination
              label={copy.pages}
              page={pages.page}
              hasPrevious={pages.hasPrevious}
              hasNext={Boolean(sales.data?.nextCursor)}
              onPrevious={pages.previous}
              onNext={() => {
                pages.next(sales.data?.nextCursor);
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
