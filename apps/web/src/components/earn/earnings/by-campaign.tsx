"use client";

import { formatTokenAmount, type ClientOutput, type EarningsBucket } from "@spoke/protocol";
import { useRouter } from "next/navigation";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { useClientContext } from "@/lib/client/provider";
import { earningsBucketCopy, fill } from "@/lib/copy";
import { formatAmount, type TokenLike } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { earningsCopy } from "../copy/earnings";
import { CampaignName, useMyLinks, type LinkRow } from "../shared/campaigns";

type CampaignEarnings = ClientOutput<"earnings.byCampaign">[number];
const copy = earningsCopy.byCampaign;

const positionOf = (link: LinkRow | undefined) =>
  !link
    ? copy.noLink
    : link.parentNodeId === "0"
      ? copy.root
      : fill(copy.level, { n: String(link.levelFromMerchant) });

const countsLine = (row: CampaignEarnings) =>
  fill(earningsCopy.salesCounts, {
    pending: String(row.sales.pending),
    settled: String(row.sales.finalized),
    refunded: String(row.sales.refunded),
  });

export function ByCampaign({
  rows,
  token,
}: {
  rows: readonly CampaignEarnings[];
  token: TokenLike;
}) {
  const { mode } = useClientContext();
  const router = useRouter();
  const links = useMyLinks();
  const buckets: EarningsBucket[] = [
    "atRisk",
    "readyToFinalize",
    "claimable",
    "claimed",
    "refunded",
    ...(mode === "demo" ? (["reversed"] as const) : []),
  ];
  const total = (bucket: EarningsBucket) =>
    rows.reduce((sum, row) => sum + BigInt(row[bucket]), 0n);
  const open = (campaignId: string) => {
    const link = links.linkFor(campaignId);
    router.push(link ? routeTo.link(link.nodeId) : routeTo.campaign(campaignId));
  };
  return (
    <>
      <p className="text-subtle text-sm max-lg:hidden">
        {fill(copy.unit, { symbol: token.symbol })}
      </p>
      <Table caption={copy.caption} className="max-lg:hidden">
        <THead>
          <tr>
            <Th>{copy.campaign}</Th>
            {buckets.map((bucket) => (
              <Th key={bucket} numeric>
                {earningsBucketCopy[bucket].totalLabel}
              </Th>
            ))}
          </tr>
        </THead>
        <TBody>
          {rows.map((row) => {
            const link = links.linkFor(row.campaignId);
            return (
              <Tr
                key={row.campaignId}
                interactive
                onClick={() => {
                  open(row.campaignId);
                }}
              >
                <Td className="min-w-[260px] py-3">
                  <span className="grid gap-1 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <CampaignName campaignId={row.campaignId} known={link?.campaign} />
                      {link ? <CampaignStateChip campaign={link.campaign} /> : null}
                    </span>
                    <span className="text-subtle">
                      {positionOf(link)} · {countsLine(row)}
                    </span>
                  </span>
                </Td>
                {buckets.map((bucket) => (
                  <Td key={bucket} numeric className="whitespace-nowrap">
                    {formatTokenAmount(BigInt(row[bucket]), row.token.decimals)}
                  </Td>
                ))}
              </Tr>
            );
          })}
          <Tr className="bg-soft">
            <Td className="font-medium">{copy.totals}</Td>
            {buckets.map((bucket) => (
              <Td key={bucket} numeric className="font-medium whitespace-nowrap">
                {formatTokenAmount(total(bucket), token.decimals)}
              </Td>
            ))}
          </Tr>
        </TBody>
      </Table>
      <ul className="grid gap-3 lg:hidden">
        {rows.map((row) => {
          const link = links.linkFor(row.campaignId);
          return (
            <li key={row.campaignId}>
              <button
                type="button"
                onClick={() => {
                  open(row.campaignId);
                }}
                className="border-hairline hover:bg-soft ease-spring grid w-full cursor-pointer gap-3 rounded-2xl border p-4 text-left transition-colors duration-[423ms]"
              >
                <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <CampaignName campaignId={row.campaignId} known={link?.campaign} />
                  {link ? <CampaignStateChip campaign={link.campaign} /> : null}
                </span>
                <span className="text-subtle text-sm">
                  {positionOf(link)} · {countsLine(row)}
                </span>
                <span className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {buckets.map((bucket) => (
                    <span key={bucket} className="grid">
                      <span className="text-subtle">{earningsBucketCopy[bucket].totalLabel}</span>
                      <span className="text-ink font-mono tabular-nums">
                        {formatAmount(BigInt(row[bucket]), row.token)}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
