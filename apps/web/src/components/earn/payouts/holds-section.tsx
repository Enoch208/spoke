"use client";

import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { LoadingSkeleton } from "@/components/product/page";
import { fill } from "@/lib/copy";
import { formatAmount, formatRelative } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { useNow } from "@/lib/use-now";
import { payoutsCopy } from "../copy/payouts";
import { CampaignName, useMyLinks } from "../shared/campaigns";
import { DialogError } from "../shared/dialog-states";
import { Section } from "../shared/section";
import { SaleButton } from "./sale-cells";

const copy = payoutsCopy.holds;

export function HoldsSection() {
  const now = useNow();
  const links = useMyLinks();
  const holds = useClientQuery(
    "earnings.byConversion",
    { state: "reserved", holdEnded: false, limit: 100 },
    { refetchInterval: 15_000 },
  );
  const rows = [...(holds.data?.items ?? [])]
    .filter((row) => Date.parse(row.unlockAt) > now)
    .sort((a, b) => a.unlockAt.localeCompare(b.unlockAt));
  const ends = (iso: string) =>
    fill(copy.endsIn, { time: formatRelative(new Date(iso), { now: new Date(now) }) });
  return (
    <Section title={copy.title} description={copy.intro} padding="none">
      {holds.isPending ? <LoadingSkeleton shape="rows" /> : null}
      {holds.error ? (
        <div className="px-5 pb-4">
          <DialogError error={holds.error} retry={() => void holds.refetch()} />
        </div>
      ) : null}
      {holds.data && rows.length === 0 ? (
        <p className="text-subtle px-5 pb-4">{copy.empty}</p>
      ) : null}
      {rows.length > 0 ? (
        <>
          <Table caption={copy.title} className="max-md:hidden">
            <THead>
              <tr>
                <Th>{copy.columns.sale}</Th>
                <Th>{copy.columns.product}</Th>
                <Th>{copy.columns.ends}</Th>
                <Th numeric>{copy.columns.share}</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <Tr key={row.saleId}>
                  <Td>
                    <SaleButton saleId={row.saleId} />
                  </Td>
                  <Td>
                    <CampaignName
                      campaignId={row.campaignId}
                      known={links.campaignOf(row.campaignId)}
                    />
                  </Td>
                  <Td className="text-amber-ink whitespace-nowrap">{ends(row.unlockAt)}</Td>
                  <Td numeric>{formatAmount(BigInt(row.amount), row.token)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <ul className="divide-hairline divide-y md:hidden">
            {rows.map((row) => (
              <li key={row.saleId} className="grid gap-1 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <SaleButton saleId={row.saleId} />
                  <span className="text-ink font-mono tabular-nums">
                    {formatAmount(BigInt(row.amount), row.token)}
                  </span>
                </div>
                <CampaignName
                  campaignId={row.campaignId}
                  known={links.campaignOf(row.campaignId)}
                />
                <p className="text-amber-ink text-sm">{ends(row.unlockAt)}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );
}
