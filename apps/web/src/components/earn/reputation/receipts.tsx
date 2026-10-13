"use client";

import type { ClientOutput } from "@spoke/protocol";
import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { ShowMore } from "@/components/ui/pagination";
import { StatusChip } from "@/components/ui/status-chip";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { formatAmount, formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { receiptHref } from "@/lib/routes";
import { activeChain } from "@/lib/wagmi";
import { reputationCopy } from "../copy/reputation";
import { CampaignName, useMyLinks } from "../shared/campaigns";
import { Section } from "../shared/section";
import { sameAddress, useViewerAddress } from "../shared/viewer";

const copy = reputationCopy.receipts;
type Receipt = ClientOutput<"reputation.mine">["evidence"]["items"][number];

function SaleLink({ saleId }: { saleId: string }) {
  return (
    <Link
      href={receiptHref(saleId, activeChain.id)}
      className="text-ink font-medium underline-offset-2 hover:underline"
    >
      #{saleId}
    </Link>
  );
}

export function Receipts({ receipts }: { receipts: readonly Receipt[] }) {
  const viewer = useViewerAddress();
  const links = useMyLinks();
  const [count, setCount] = useState(10);
  const pending = useClientQuery("earnings.byConversion", { state: "reserved", limit: 20 });
  const refunded = useClientQuery("earnings.byConversion", { state: "refunded", limit: 20 });
  const counted = receipts.filter((receipt) => receipt.state === "FINALIZED");
  const share = (receipt: Receipt) =>
    receipt.allocations.find((allocation) => sameAddress(allocation.recipient.address, viewer));
  const notCounted = [
    ...(pending.data?.items ?? []).map((row) => ({
      row,
      label: copy.pending,
      icon: Clock01Icon,
      tone: "amber" as const,
    })),
    ...(refunded.data?.items ?? []).map((row) => ({
      row,
      label: copy.refunded,
      icon: ArrowTurnBackwardIcon,
      tone: "pink" as const,
    })),
  ];
  return (
    <Section title={copy.title} padding="none">
      <Table caption={copy.title} className="max-md:hidden">
        <THead>
          <tr>
            <Th>{copy.product}</Th>
            <Th>{copy.sale}</Th>
            <Th numeric>{copy.share}</Th>
            <Th>{copy.finalized}</Th>
            <Th>{copy.counted}</Th>
          </tr>
        </THead>
        <TBody>
          {counted.slice(0, count).map((receipt) => {
            const mine = share(receipt);
            return (
              <Tr key={receipt.saleId}>
                <Td className="max-w-[280px]">
                  <CampaignName
                    campaignId={receipt.campaignId}
                    known={links.campaignOf(receipt.campaignId)}
                  />
                </Td>
                <Td>
                  <SaleLink saleId={receipt.saleId} />
                </Td>
                <Td numeric>{mine ? formatAmount(BigInt(mine.amount), receipt.token) : "—"}</Td>
                <Td className="text-body whitespace-nowrap">
                  {receipt.finalizeTx?.at ? formatDateTime(new Date(receipt.finalizeTx.at)) : "—"}
                </Td>
                <Td>
                  <StatusChip label={copy.settled} icon={CheckmarkBadge01Icon} tone="lime" />
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
      <ul className="divide-hairline divide-y md:hidden">
        {counted.slice(0, count).map((receipt) => {
          const mine = share(receipt);
          return (
            <li key={receipt.saleId} className="grid gap-1.5 px-5 py-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <SaleLink saleId={receipt.saleId} />
                <span className="text-ink font-mono tabular-nums">
                  {mine ? formatAmount(BigInt(mine.amount), receipt.token) : "—"}
                </span>
              </div>
              <CampaignName
                campaignId={receipt.campaignId}
                known={links.campaignOf(receipt.campaignId)}
              />
              <StatusChip
                label={copy.settled}
                icon={CheckmarkBadge01Icon}
                tone="lime"
                className="justify-self-start"
              />
            </li>
          );
        })}
      </ul>
      {counted.length > count ? (
        <ShowMore
          label={copy.more}
          onClick={() => {
            setCount(count + 20);
          }}
        />
      ) : null}
      {notCounted.length > 0 ? (
        <div className="border-hairline grid gap-2 border-t px-5 py-4">
          <h3 className="text-ink text-sm font-medium">{copy.notCounted}</h3>
          <ul className="grid gap-2">
            {notCounted.slice(0, 8).map(({ row, label, icon, tone }) => (
              <li
                key={`${row.saleId}-${label}`}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <SaleLink saleId={row.saleId} />
                  <CampaignName
                    campaignId={row.campaignId}
                    known={links.campaignOf(row.campaignId)}
                    withMerchant={false}
                  />
                </span>
                <StatusChip label={label} icon={icon} tone={tone} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
