"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClientOutput } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { TxHash } from "@/components/ui/address";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { formatAmount, formatDateTime, formatSignedAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { activeChain } from "@/lib/wagmi";
import { movementKindCopy, vaultCopy as copy, type MovementKindKey } from "../copy/vault";
import { useIsDemo } from "./hooks";
import { useCursorPages } from "./use-cursor-pages";

type Movement = ClientOutput<"vault.movements">["items"][number];

const kindFilters = [
  { value: "all", label: copy.allKinds },
  { value: "deposited", label: "Deposits" },
  { value: "reserved", label: "Reservations" },
  { value: "finalized", label: "Finalized sales" },
  { value: "refunded", label: "Refunds" },
  { value: "claimed", label: "Claims" },
  { value: "withdrawn", label: "Withdrawals" },
] as const;

type KindFilter = (typeof kindFilters)[number]["value"];

export const movementKey = (row: Movement): MovementKindKey => {
  const proceeds = row.source === "SALE_PROCEEDS";
  if (row.kind === "deposited") return "deposited";
  if (row.kind === "reserved") return "reserved";
  if (row.kind === "withdrawn") return "withdrawn";
  if (row.kind === "finalized") return proceeds ? "proceedsReleased" : "settled";
  if (row.kind === "refunded") return proceeds ? "buyerRefunded" : "released";
  return proceeds ? "proceedsClaimed" : "claimedReward";
};

const outflow = new Set<MovementKindKey>(["withdrawn", "buyerRefunded", "proceedsClaimed"]);
const inflow = new Set<MovementKindKey>(["deposited"]);

const signed = (row: Movement, key: MovementKindKey) => {
  const amount = BigInt(row.amount);
  if (inflow.has(key)) return formatSignedAmount(amount, row.token);
  if (outflow.has(key)) return formatSignedAmount(-amount, row.token);
  return formatAmount(amount, row.token);
};

function MovementLabel({ row }: { row: Movement }) {
  const key = movementKey(row);
  const kind = movementKindCopy[key];
  const label = fill(kind.label, { id: row.saleId ?? "" });
  return (
    <div className="min-w-0">
      <p className="text-ink text-sm font-medium md:text-base">
        {row.saleId ? (
          <Link href={`/sell/sales/${row.saleId}`} className="hover:underline">
            {label}
          </Link>
        ) : (
          label
        )}
      </p>
      <p className="text-subtle text-xs">
        {kind.from ? `${kind.from} → ` : "→ "}
        {kind.to}
      </p>
    </div>
  );
}

export function MovementsLedger({
  campaignId,
  names,
}: {
  campaignId?: string;
  names: ReadonlyMap<string, string>;
}) {
  const demo = useIsDemo();
  const pages = useCursorPages();
  const [kind, setKind] = useState<KindFilter>("all");
  const [campaign, setCampaign] = useState<string>("all");
  const scope = campaignId ?? (campaign === "all" ? undefined : campaign);
  const movements = useClientQuery("vault.movements", {
    limit: 25,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
    ...(scope ? { campaignId: scope } : {}),
    ...(kind === "all" ? {} : { kind }),
  });
  const rows = movements.data?.items ?? [];
  const nameOf = (id: string) => names.get(id) ?? `Campaign #${id}`;
  return (
    <Card padding="none" className="overflow-hidden">
      <header className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-h4 text-ink font-medium">{copy.movements}</h2>
          <p className="text-subtle mt-1 text-sm">{copy.movementsCaption}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaignId ? null : (
            <Select
              value={campaign}
              onValueChange={(value) => {
                setCampaign(value);
                pages.reset();
              }}
              className="w-full sm:w-52"
              options={[
                { value: "all", label: copy.allCampaigns },
                ...[...names.entries()].map(([id, name]) => ({ value: id, label: name })),
              ]}
            />
          )}
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value);
              pages.reset();
            }}
            className="w-full sm:w-44"
            options={kindFilters}
          />
        </div>
      </header>
      {movements.isPending ? (
        <SkeletonRows rows={6} />
      ) : movements.error ? (
        <ErrorState
          variant="section"
          title="We couldn’t load your movements."
          body="Check your connection and try again."
          actions={
            <Button variant="secondary" onClick={() => void movements.refetch()}>
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState variant="compact" title={copy.movementsEmpty} />
      ) : (
        <>
          <Table caption={copy.movementsCaption} className="hidden md:block">
            <THead>
              <tr>
                <Th>Time</Th>
                {campaignId ? null : <Th>Campaign</Th>}
                <Th>Movement</Th>
                <Th numeric>Amount</Th>
                <Th>{copy.transaction}</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((row, index) => (
                <Tr key={`${row.tx.hash}-${row.kind}-${String(index)}`}>
                  <Td className="text-subtle whitespace-nowrap">
                    {formatDateTime(new Date(row.at))}
                  </Td>
                  {campaignId ? null : (
                    <Td className="max-w-48 truncate">
                      <Link
                        href={`/sell/campaigns/${row.campaignId}?tab=budget`}
                        className="hover:underline"
                      >
                        {nameOf(row.campaignId)}
                      </Link>
                    </Td>
                  )}
                  <Td>
                    <MovementLabel row={row} />
                  </Td>
                  <Td numeric className="whitespace-nowrap">
                    {signed(row, movementKey(row))}
                  </Td>
                  <Td>
                    <TxHash hash={row.tx.hash} chainId={activeChain.id} demo={demo} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <ul className="divide-hairline divide-y md:hidden">
            {rows.map((row, index) => (
              <li
                key={`${row.tx.hash}-${row.kind}-${String(index)}`}
                className="flex items-start justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <MovementLabel row={row} />
                  <p className="text-subtle mt-1 text-xs">
                    {formatDateTime(new Date(row.at))}
                    {campaignId ? "" : ` · ${nameOf(row.campaignId)}`}
                  </p>
                </div>
                <span className="text-ink shrink-0 font-mono text-sm tabular-nums">
                  {signed(row, movementKey(row))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {pages.hasPrevious || movements.data?.nextCursor ? (
        <div className="border-hairline border-t px-5 py-3">
          <Pagination
            label={copy.movements}
            page={pages.page}
            hasPrevious={pages.hasPrevious}
            hasNext={Boolean(movements.data?.nextCursor)}
            onPrevious={pages.previous}
            onNext={() => {
              if (movements.data?.nextCursor) pages.next(movements.data.nextCursor);
            }}
          />
        </div>
      ) : null}
    </Card>
  );
}
