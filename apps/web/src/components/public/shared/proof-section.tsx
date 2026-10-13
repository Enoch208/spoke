"use client";

import { LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { explorerAddressUrl, explorerTxUrl, isSupportedChainId } from "@spoke/protocol";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue } from "@/components/ui/key-value";
import { useClientContext } from "@/lib/client/provider";
import { common, fill, toasts } from "@/lib/copy";
import { shortAddress, shortHash } from "@/lib/format";
import { proofCopy } from "../copy/proof";
import { Collapsible } from "./collapsible";

export type ProofRow = { key: string; label: string; note?: string } & (
  { kind: "text"; value: string } | { kind: "hash" | "tx" | "address"; value: string | null }
);

function ExplorerIcon({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="text-subtle hover:text-ink inline-flex size-8 shrink-0 items-center justify-center rounded-full"
    >
      <HugeiconsIcon icon={LinkSquare02Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
    </a>
  );
}

function RowValue({ row, chainId, demo }: { row: ProofRow; chainId: number; demo: boolean }) {
  if (row.kind === "text") return <span className="font-mono tabular-nums">{row.value}</span>;
  if (demo || !row.value) return <span className="font-ui text-subtle">{proofCopy.simulated}</span>;
  const value = row.value;
  const short = row.kind === "address" ? shortAddress(value) : shortHash(value);
  const href = !isSupportedChainId(chainId)
    ? null
    : row.kind === "tx"
      ? explorerTxUrl(chainId, value)
      : row.kind === "address"
        ? explorerAddressUrl(chainId, value)
        : null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono tabular-nums" title={value}>
        {short}
      </span>
      <CopyButton value={value} label={common.copy} copiedMessage={toasts["T-01"].copy.hash} />
      {href ? (
        <ExplorerIcon
          href={href}
          label={
            row.kind === "tx"
              ? fill(common.transactionOnExplorer, { shortHash: short })
              : fill(common.addressOnExplorer, { shortAddress: short })
          }
        />
      ) : null}
    </span>
  );
}

export function ProofSection({
  rows,
  chainId,
  footer,
}: {
  rows: readonly ProofRow[];
  chainId: number;
  footer?: ReactNode;
}) {
  const { mode } = useClientContext();
  return (
    <Collapsible title={proofCopy.heading} id="proof">
      <KeyValue
        items={rows.map((row) => ({
          key: row.key,
          label: row.note ? (
            <span className="flex flex-col">
              {row.label}
              <span className="text-faint">{row.note}</span>
            </span>
          ) : (
            row.label
          ),
          value: <RowValue row={row} chainId={chainId} demo={mode === "demo"} />,
        }))}
      />
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Collapsible>
  );
}
