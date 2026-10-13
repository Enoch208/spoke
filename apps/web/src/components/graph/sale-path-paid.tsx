"use client";

import { DiamondIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps, type TokenLike } from "@/lib/format";
import { AllocationChip } from "./allocation-chip";
import { graphCopy, salePanelCopy } from "./copy";
import { personLabel } from "./person";
import type { PathEntry } from "./sale-path-table";

export type PaidRow = { entry: PathEntry; level: number; self: boolean };

const struck = (entry: PathEntry) => entry.state === "refunded" || entry.state === "reversed";

function Buyer() {
  return (
    <span className="text-subtle inline-flex items-center gap-2 whitespace-nowrap">
      <HugeiconsIcon icon={DiamondIcon} size={16} strokeWidth={1.8} aria-hidden="true" />
      {graphCopy.buyerPrivate}
    </span>
  );
}

function LevelText({ level }: { level: number }) {
  return (
    <>
      {fill(graphCopy.level, { n: String(level) })}
      {level === 1 ? <span className="text-subtle block text-xs">{graphCopy.nearest}</span> : null}
    </>
  );
}

export function PaidRows({
  saleId,
  rows,
  token,
  total,
  exact,
}: {
  saleId: string;
  rows: readonly PaidRow[];
  token: TokenLike;
  total: bigint;
  exact: boolean;
}) {
  const totalText = fill(salePanelCopy.total, { reward: formatAmount(total, token) });
  return (
    <>
      <Table caption={fill(salePanelCopy.pathCaption, { saleId })} className="max-sm:hidden">
        <THead>
          <tr>
            <Th>{salePanelCopy.columns.person}</Th>
            <Th>{salePanelCopy.columns.level}</Th>
            <Th numeric>{salePanelCopy.columns.share}</Th>
            <Th numeric>{salePanelCopy.columns.amount}</Th>
            <Th>{salePanelCopy.columns.state}</Th>
          </tr>
        </THead>
        <TBody>
          <Tr>
            <Td>
              <Buyer />
            </Td>
            <Td className="text-subtle">—</Td>
            <Td />
            <Td />
            <Td />
          </Tr>
          {rows.map(({ entry, level, self }) => (
            <Tr key={entry.nodeId} className={cx(self && "bg-lime-soft/60")}>
              <Td className="font-medium">
                {personLabel(entry.creator, { self, nodeId: entry.nodeId })}
              </Td>
              <Td className="text-body whitespace-nowrap">
                <LevelText level={level} />
              </Td>
              <Td numeric>{formatBps(entry.effectiveWeightBps)}</Td>
              <Td
                numeric
                className={cx("whitespace-nowrap", struck(entry) && "text-subtle line-through")}
              >
                {formatAmount(BigInt(entry.amount), token)}
              </Td>
              <Td>{entry.state ? <AllocationChip state={entry.state} /> : null}</Td>
            </Tr>
          ))}
          <Tr>
            <Td colSpan={3} className="text-subtle text-sm">
              {exact ? salePanelCopy.totalNote : null}
            </Td>
            <Td numeric className="font-medium whitespace-nowrap">
              {totalText}
            </Td>
            <Td />
          </Tr>
        </TBody>
      </Table>
      <ol
        aria-label={fill(salePanelCopy.pathCaption, { saleId })}
        className="divide-hairline divide-y sm:hidden"
      >
        <li className="py-3 text-sm">
          <Buyer />
        </li>
        {rows.map(({ entry, level, self }) => (
          <li
            key={entry.nodeId}
            className={cx(
              "grid gap-1 py-3 text-sm",
              self && "bg-lime-soft/60 -mx-2 rounded-xl px-2",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-ink font-medium">
                {personLabel(entry.creator, { self, nodeId: entry.nodeId })}
              </span>
              <span
                className={cx(
                  "text-ink font-mono tabular-nums",
                  struck(entry) && "text-subtle line-through",
                )}
              >
                {formatAmount(BigInt(entry.amount), token)}
              </span>
            </span>
            <span className="flex items-center justify-between gap-3">
              <span className="text-body">
                {fill(graphCopy.level, { n: String(level) })} ·{" "}
                {formatBps(entry.effectiveWeightBps)}
              </span>
              {entry.state ? <AllocationChip state={entry.state} /> : null}
            </span>
          </li>
        ))}
        <li className="grid gap-1 py-3 text-sm">
          <span className="text-ink text-right font-mono font-medium tabular-nums">
            {totalText}
          </span>
          {exact ? <span className="text-subtle text-right">{salePanelCopy.totalNote}</span> : null}
        </li>
      </ol>
    </>
  );
}
