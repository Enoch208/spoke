"use client";

import { CheckmarkCircle02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { TxHash } from "@/components/ui/address";
import { Pagination } from "@/components/ui/pagination";
import { StatusChip } from "@/components/ui/status-chip";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/product/page";
import { useClientContext } from "@/lib/client/provider";
import { formatAmount, formatCount, formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus } from "@/lib/tx/records";
import { activeChain } from "@/lib/wagmi";
import { payoutsCopy } from "../copy/payouts";
import { DialogError } from "../shared/dialog-states";
import { Section } from "../shared/section";
import { useCursorPages } from "../shared/use-pages";

const copy = payoutsCopy.history;

function SyncingClaims() {
  const records = useTxStore((state) => state.records);
  const syncing = records.filter(
    (record) =>
      record.kind === "claimRewards" &&
      (overallStatus(record) === "syncing" || record.steps.at(-1)?.status === "confirmed"),
  );
  if (syncing.length === 0) return null;
  return (
    <ul className="px-5 pb-2">
      {syncing.map((record) => (
        <li
          key={record.id}
          className="bg-sky-soft flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
        >
          <StatusChip label={copy.syncing} icon={RefreshIcon} tone="sky" />
          <TxHash
            hash={record.steps.at(-1)?.hash ?? null}
            chainId={activeChain.id}
            demo={record.mode === "demo"}
          />
        </li>
      ))}
    </ul>
  );
}

export function HistorySection() {
  const { mode } = useClientContext();
  const pages = useCursorPages();
  const claims = useClientQuery("earnings.claims", {
    limit: 25,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  const rows = claims.data?.items ?? [];
  const live = mode === "live";
  return (
    <Section id="history" title={copy.title} padding="none">
      <SyncingClaims />
      {claims.isPending ? <LoadingSkeleton shape="rows" /> : null}
      {claims.error ? (
        <div className="px-5 pb-4">
          <DialogError error={claims.error} retry={() => void claims.refetch()} />
        </div>
      ) : null}
      {claims.data && rows.length === 0 ? (
        <p className="text-subtle px-5 pb-4">{copy.empty}</p>
      ) : null}
      {rows.length > 0 ? (
        <>
          <Table caption={copy.title} className="max-md:hidden">
            <THead>
              <tr>
                <Th>{copy.columns.date}</Th>
                <Th numeric>{copy.columns.amount}</Th>
                <Th>{copy.columns.token}</Th>
                <Th>{copy.columns.status}</Th>
                <Th>{copy.columns.tx}</Th>
                {live ? <Th numeric>{copy.columns.block}</Th> : null}
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <Tr key={row.tx.hash}>
                  <Td className="text-body whitespace-nowrap">
                    {formatDateTime(new Date(row.at))}
                  </Td>
                  <Td numeric>{formatAmount(BigInt(row.amount), row.token)}</Td>
                  <Td className="text-body">{row.token.symbol}</Td>
                  <Td>
                    <StatusChip label={copy.claimed} icon={CheckmarkCircle02Icon} tone="ink" />
                  </Td>
                  <Td>
                    <TxHash hash={row.tx.hash} chainId={activeChain.id} demo={!live} />
                  </Td>
                  {live ? <Td numeric>{formatCount(BigInt(row.tx.blockNumber))}</Td> : null}
                </Tr>
              ))}
            </TBody>
          </Table>
          <ul className="divide-hairline divide-y md:hidden">
            {rows.map((row) => (
              <li key={row.tx.hash} className="grid gap-2 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink font-mono tabular-nums">
                    {formatAmount(BigInt(row.amount), row.token)}
                  </span>
                  <StatusChip label={copy.claimed} icon={CheckmarkCircle02Icon} tone="ink" />
                </div>
                <p className="text-subtle text-sm">{formatDateTime(new Date(row.at))}</p>
                <TxHash hash={row.tx.hash} chainId={activeChain.id} demo={!live} />
              </li>
            ))}
          </ul>
          {pages.hasPrevious || claims.data?.nextCursor ? (
            <Pagination
              className="px-5 py-3"
              label={copy.pages}
              page={pages.page}
              hasPrevious={pages.hasPrevious}
              hasNext={Boolean(claims.data?.nextCursor)}
              onPrevious={pages.previous}
              onNext={() => {
                pages.next(claims.data?.nextCursor);
              }}
            />
          ) : null}
        </>
      ) : null}
    </Section>
  );
}
