"use client";

import Link from "next/link";
import { demoToken } from "@spoke/protocol";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fill } from "@/lib/copy";
import { formatAmount, formatDateTime, formatHandle } from "@/lib/format";
import { salesCopy as copy } from "../copy/sales";
import { canFinalizeSale, merchantSaleKey, MerchantSaleChip } from "./sale-chip";
import { SaleRowAction } from "./sale-row-actions";
import type { SaleListRow } from "./sales-query";

const money = (value: string) => formatAmount(BigInt(value), demoToken);

const through = (row: SaleListRow) =>
  row.referrerHandle ? formatHandle(row.referrerHandle) : copy.direct;

function RequestFlag({ row }: { row: SaleListRow }) {
  return row.refundRequestStatus === "open" && row.state === "PENDING" ? (
    <Badge tone="pink">{copy.refundRequested}</Badge>
  ) : null;
}

export function SaleTableRows({
  rows,
  now,
  names,
  showCampaign,
  selected,
  selectable,
  allSelected,
  onToggle,
  onToggleAll,
  onOpen,
}: {
  rows: readonly SaleListRow[];
  now: number;
  names: ReadonlyMap<string, string>;
  showCampaign: boolean;
  selected: readonly string[];
  selectable: boolean;
  allSelected: boolean;
  onToggle: (saleId: string, on: boolean) => void;
  onToggleAll: (on: boolean) => void;
  onOpen: (saleId: string) => void;
}) {
  return (
    <Table caption={copy.title} className="hidden md:block">
      <THead>
        <tr>
          <Th className="w-10">
            {selectable ? (
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                label={<span className="sr-only">{copy.selectAll}</span>}
              />
            ) : null}
          </Th>
          <Th>{copy.columns.sale}</Th>
          {showCampaign ? <Th>{copy.columns.campaign}</Th> : null}
          <Th>{copy.columns.through}</Th>
          <Th numeric>{copy.columns.price}</Th>
          <Th numeric>{copy.columns.reward}</Th>
          <Th numeric>{copy.columns.paid}</Th>
          <Th>{copy.columns.status}</Th>
          <Th>
            <span className="sr-only">Actions</span>
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const ready = canFinalizeSale(row.state, row.unlockAt, now);
          return (
            <Tr
              key={row.saleId}
              interactive
              selected={selected.includes(row.saleId)}
              onClick={() => {
                onOpen(row.saleId);
              }}
            >
              <Td
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                {ready ? (
                  <Checkbox
                    checked={selected.includes(row.saleId)}
                    onCheckedChange={(on) => {
                      onToggle(row.saleId, on);
                    }}
                    label={<span className="sr-only">{fill(copy.select, { id: row.saleId })}</span>}
                  />
                ) : null}
              </Td>
              <Td className="whitespace-nowrap">
                <Link
                  href={`/sell/sales/${row.saleId}`}
                  className="text-ink font-medium hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  #{row.saleId}
                </Link>
                <p className="text-subtle text-xs">{formatDateTime(new Date(row.purchasedAt))}</p>
              </Td>
              {showCampaign ? (
                <Td className="max-w-48">
                  <span className="block truncate" title={row.productTitle}>
                    {names.get(row.campaignId) ?? row.productTitle}
                  </span>
                </Td>
              ) : null}
              <Td className="text-body whitespace-nowrap">{through(row)}</Td>
              <Td numeric>{money(row.amountPaid)}</Td>
              <Td numeric>{money(row.reward)}</Td>
              <Td numeric className="font-ui">
                {fill(copy.paidOf, { paid: String(row.paidCount), max: String(row.maxPaid) })}
              </Td>
              <Td>
                <div className="flex flex-col items-start gap-1">
                  <MerchantSaleChip
                    stateKey={merchantSaleKey(row.state, row.unlockAt, row.proceedsState, now)}
                    unlockAt={row.unlockAt}
                    now={now}
                  />
                  <RequestFlag row={row} />
                </div>
              </Td>
              <Td className="text-right">
                <SaleRowAction row={row} now={now} />
              </Td>
            </Tr>
          );
        })}
      </TBody>
    </Table>
  );
}

export function SaleCards({
  rows,
  now,
  names,
  showCampaign,
}: {
  rows: readonly SaleListRow[];
  now: number;
  names: ReadonlyMap<string, string>;
  showCampaign: boolean;
}) {
  return (
    <ul className="divide-hairline divide-y md:hidden">
      {rows.map((row) => (
        <li key={row.saleId} className="relative space-y-2 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/sell/sales/${row.saleId}`}
                className="text-ink font-medium after:absolute after:inset-0"
              >
                Sale #{row.saleId}
              </Link>
              <p className="text-subtle truncate text-xs">
                {formatDateTime(new Date(row.purchasedAt))}
                {showCampaign ? ` · ${names.get(row.campaignId) ?? row.productTitle}` : ""}
              </p>
            </div>
            <span className="text-ink shrink-0 font-mono text-sm tabular-nums">
              {money(row.amountPaid)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <MerchantSaleChip
                stateKey={merchantSaleKey(row.state, row.unlockAt, row.proceedsState, now)}
                unlockAt={row.unlockAt}
                now={now}
              />
              <RequestFlag row={row} />
            </div>
            <div className="relative z-10">
              <SaleRowAction row={row} now={now} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
