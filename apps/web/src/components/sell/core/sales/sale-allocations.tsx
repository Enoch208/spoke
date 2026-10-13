"use client";

import type { ClientOutput, SaleReceipt } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { earningsBucketCopy, fill } from "@/lib/copy";
import { formatAmount, formatBps, formatPerson, formatSplit } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { saleDetailCopy as copy } from "../copy/sales";
import { hasModal } from "../shared/has-modal";
import { splitNotes, type PolicyVersion } from "../shared/policy";

type PathEntry = ClientOutput<"graph.salePath">["nodes"][number];
type Share = NonNullable<PathEntry["state"]>;

const shareChip = (state: Share) =>
  state === "reserved"
    ? { label: "Reserved", icon: earningsBucketCopy.atRisk.icon, tone: "amber" as const }
    : earningsBucketCopy[state];

type Row = {
  key: string;
  level: number | null;
  person: string;
  nodeId: string | null;
  weightBps: number;
  amount: bigint;
  state: Share | null;
  outside: boolean;
};

const rowsFrom = (receipt: SaleReceipt, path: readonly PathEntry[] | undefined): Row[] => {
  if (path && path.length > 0) {
    let level = 0;
    return path.map((entry) => {
      if (entry.paid) level += 1;
      const allocation = entry.paid
        ? receipt.allocations.find((candidate) => candidate.level === level)
        : undefined;
      return {
        key: entry.nodeId,
        level: entry.paid ? level : null,
        person: formatPerson({ handle: entry.creator.handle, address: entry.creator.address }),
        nodeId: entry.nodeId,
        weightBps: entry.effectiveWeightBps,
        amount: BigInt(entry.amount),
        state: allocation?.state ?? entry.state,
        outside: !entry.paid,
      };
    });
  }
  return receipt.allocations.map((allocation) => ({
    key: String(allocation.level),
    level: allocation.level,
    person: formatPerson({
      handle: allocation.recipient.handle,
      address: allocation.recipient.address,
    }),
    nodeId: null,
    weightBps: allocation.effectiveWeightBps,
    amount: BigInt(allocation.amount),
    state: allocation.state,
    outside: false,
  }));
};

export function SaleAllocations({
  receipt,
  path,
  version,
}: {
  receipt: SaleReceipt;
  path: readonly PathEntry[] | undefined;
  version: PolicyVersion | undefined;
}) {
  const rows = rowsFrom(receipt, path);
  const paid = rows.filter((row) => !row.outside);
  const notes = version ? splitNotes(BigInt(receipt.price), version, paid.length) : null;
  const token = receipt.token;
  return (
    <Card padding="none" className="overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h2 className="font-display text-h4 text-ink font-medium">{copy.path}</h2>
          <p className="text-subtle mt-1 text-sm">{copy.pathNote}</p>
        </div>
        {hasModal("M-16") && paid.length > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              useUiStore.getState().open("M-16", { saleId: receipt.saleId });
            }}
          >
            {copy.openPath}
          </Button>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <p className="text-body px-5 pb-5">{copy.nobody}</p>
      ) : (
        <>
          <Table caption={copy.path} className="hidden sm:block">
            <THead>
              <tr>
                <Th>Level</Th>
                <Th>Distributor</Th>
                <Th numeric>Weight</Th>
                <Th numeric>Amount</Th>
                <Th>Share</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <Tr key={row.key}>
                  <Td className="text-subtle whitespace-nowrap">
                    {row.level === null ? "—" : fill(copy.level, { n: String(row.level) })}
                  </Td>
                  <Td>
                    <span className="text-ink">{row.person}</span>
                    {row.nodeId ? (
                      <span className="text-subtle block font-mono text-xs">Link {row.nodeId}</span>
                    ) : null}
                  </Td>
                  <Td numeric>{row.outside ? "—" : formatBps(row.weightBps)}</Td>
                  <Td numeric>{formatAmount(row.outside ? 0n : row.amount, token)}</Td>
                  <Td>
                    {row.outside ? (
                      <span className="text-subtle text-sm">{copy.outside}</span>
                    ) : row.state ? (
                      <StatusChip {...shareChip(row.state)} />
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <ul className="divide-hairline divide-y sm:hidden">
            {rows.map((row) => (
              <li key={row.key} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-ink truncate text-sm font-medium">{row.person}</p>
                  <p className="text-subtle text-xs">
                    {row.level === null ? copy.outside : fill(copy.level, { n: String(row.level) })}
                    {row.outside ? "" : ` · ${formatBps(row.weightBps)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-ink font-mono text-sm tabular-nums">
                    {formatAmount(row.outside ? 0n : row.amount, token)}
                  </span>
                  {!row.outside && row.state ? <StatusChip {...shareChip(row.state)} /> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {notes && (notes.short || notes.returned > 0n || notes.remainder > 0n) ? (
        <ul className="border-hairline text-body space-y-1 border-t px-5 py-4 text-sm">
          {notes.short && notes.returned === 0n ? (
            <li>
              {fill(copy.shortPath, {
                k: String(paid.length),
                split: formatSplit(notes.weightsBps),
              })}
            </li>
          ) : null}
          {notes.returned > 0n ? (
            <li>{fill(copy.returned, { amount: formatAmount(notes.returned, token) })}</li>
          ) : null}
          {notes.remainder > 0n ? (
            <li>{fill(copy.remainder, { amount: formatAmount(notes.remainder, token) })}</li>
          ) : null}
        </ul>
      ) : null}
    </Card>
  );
}
