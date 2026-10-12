"use client";

import { protocolLimits } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/product/page";
import { fill } from "@/lib/copy";
import { formatAmount, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { useNow } from "@/lib/use-now";
import { payoutsCopy } from "../copy/payouts";
import { useMyLinks } from "../shared/campaigns";
import { DialogError } from "../shared/dialog-states";
import { Section } from "../shared/section";
import { FinalizeButton, ProductCell, SaleButton, SharesOnSale } from "./sale-cells";

const copy = payoutsCopy.finalize;

export function FinalizeSection() {
  const now = useNow();
  const open = useUiStore((state) => state.open);
  const links = useMyLinks();
  const ready = useClientQuery(
    "earnings.byConversion",
    { state: "reserved", holdEnded: true, limit: 100 },
    { refetchInterval: 15_000 },
  );
  const rows = [...(ready.data?.items ?? [])].sort((a, b) => a.unlockAt.localeCompare(b.unlockAt));
  const batch = rows.slice(0, protocolLimits.maxBatchFinalize).map((row) => row.saleId);
  const when = (iso: string) => formatRelative(new Date(iso), { now: new Date(now) });
  return (
    <Section
      id="finalize"
      title={copy.title}
      description={copy.intro}
      actions={
        rows.length > 1 ? (
          <Button size="sm" onClick={() => open("M-20", { saleIds: batch })}>
            {rows.length > protocolLimits.maxBatchFinalize
              ? fill(copy.someOf, { n: String(rows.length) })
              : fill(copy.all, { n: String(rows.length) })}
          </Button>
        ) : undefined
      }
      padding="none"
    >
      {ready.isPending ? <LoadingSkeleton shape="rows" /> : null}
      {ready.error ? (
        <div className="px-5 pb-4">
          <DialogError error={ready.error} retry={() => void ready.refetch()} />
        </div>
      ) : null}
      {ready.data && rows.length === 0 ? (
        <p className="text-subtle px-5 pb-4">{copy.empty}</p>
      ) : null}
      {rows.length > 0 ? (
        <>
          <Table caption={copy.title} className="max-md:hidden">
            <THead>
              <tr>
                <Th>{copy.columns.sale}</Th>
                <Th>{copy.columns.product}</Th>
                <Th>{copy.columns.ended}</Th>
                <Th numeric>{copy.columns.share}</Th>
                <Th>{copy.columns.shares}</Th>
                <Th>
                  <span className="sr-only">{copy.action}</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <Tr key={row.saleId}>
                  <Td>
                    <SaleButton saleId={row.saleId} />
                  </Td>
                  <Td>
                    <ProductCell
                      campaignId={row.campaignId}
                      campaign={links.campaignOf(row.campaignId)}
                    />
                  </Td>
                  <Td className="text-body whitespace-nowrap">{when(row.unlockAt)}</Td>
                  <Td numeric>{formatAmount(BigInt(row.amount), row.token)}</Td>
                  <Td>
                    <SharesOnSale saleId={row.saleId} />
                  </Td>
                  <Td className="text-right">
                    <FinalizeButton saleId={row.saleId} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <ul className="divide-hairline divide-y md:hidden">
            {rows.map((row) => (
              <li key={row.saleId} className="grid gap-2 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <SaleButton saleId={row.saleId} />
                  <span className="text-ink font-mono tabular-nums">
                    {formatAmount(BigInt(row.amount), row.token)}
                  </span>
                </div>
                <ProductCell
                  campaignId={row.campaignId}
                  campaign={links.campaignOf(row.campaignId)}
                />
                <p className="text-subtle text-sm">
                  {copy.columns.ended} {when(row.unlockAt)}
                </p>
                <SharesOnSale saleId={row.saleId} />
                <FinalizeButton saleId={row.saleId} block />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );
}
