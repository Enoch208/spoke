"use client";

import Link from "next/link";
import { demoToken } from "@spoke/protocol";
import { CampaignStateKeyChip } from "@/components/product/campaign-state-chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { formatAmount, formatDateTime } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { campaignsCopy as copy } from "../copy/campaigns";
import type { MerchantCampaignRow } from "../shared/campaign-rules";
import { isExhausted, isLowBudget, shareOf } from "../shared/ledger";
import { CampaignRowActions } from "./campaign-row-actions";
import { coveredText, termsText } from "./campaign-view";

type Launched = MerchantCampaignRow & { campaignId: string };

function Budget({ row }: { row: Launched }) {
  const available = BigInt(row.availableRewards);
  const reward = BigInt(row.rewardPerSale);
  const cap = BigInt(row.policy.campaignLiabilityCap);
  const tone = isExhausted(available, reward)
    ? "pink"
    : isLowBudget(available, reward, row.budgetAlertSales)
      ? "amber"
      : "lime";
  const covered = coveredText(available, reward);
  return (
    <div className="min-w-32 space-y-1.5">
      <p className="text-ink font-mono text-sm tabular-nums">
        {formatAmount(available, demoToken)}
      </p>
      <ProgressBar
        value={shareOf(available, cap)}
        max={100}
        tone={tone}
        label={copy.budgetBar}
        className="h-1.5"
      />
      {covered ? <p className="text-subtle text-xs">{covered}</p> : null}
    </div>
  );
}

const ctxOf = (row: Launched) => ({
  campaignId: row.campaignId,
  stateKey: merchantRowStateKey(row),
  available: BigInt(row.availableRewards),
});

export function CampaignTable({ rows }: { rows: readonly Launched[] }) {
  return (
    <Table caption={copy.title} className="hidden lg:block">
      <THead>
        <tr>
          <Th>{copy.columns.campaign}</Th>
          <Th>{copy.columns.state}</Th>
          <Th>{copy.columns.terms}</Th>
          <Th>{copy.columns.budget}</Th>
          <Th numeric>{copy.columns.pending}</Th>
          <Th numeric>{copy.columns.settled}</Th>
          <Th>{copy.columns.ends}</Th>
          <Th>
            <span className="sr-only">Actions</span>
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <Tr key={row.campaignId}>
            <Td className="max-w-52">
              <Link
                href={routeTo.sellCampaign(row.campaignId)}
                className="text-ink block truncate font-medium hover:underline"
                title={row.productTitle}
              >
                {row.productTitle}
              </Link>
              <p className="text-subtle text-xs">Campaign #{row.campaignId}</p>
            </Td>
            <Td>
              <CampaignStateKeyChip stateKey={merchantRowStateKey(row)} />
            </Td>
            <Td className="text-body max-w-40 text-sm">{termsText(row.policy)}</Td>
            <Td className="py-3">
              <Budget row={row} />
            </Td>
            <Td numeric>{row.pendingSales}</Td>
            <Td numeric>{row.sales.finalized}</Td>
            <Td className="text-subtle max-w-24 text-sm">{formatDateTime(new Date(row.endsAt))}</Td>
            <Td>
              <CampaignRowActions ctx={ctxOf(row)} name={row.productTitle} />
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export function CampaignCards({ rows }: { rows: readonly Launched[] }) {
  return (
    <ul className="divide-hairline divide-y lg:hidden">
      {rows.map((row) => (
        <li key={row.campaignId} className="relative space-y-3 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={routeTo.sellCampaign(row.campaignId)}
                className="text-ink font-medium after:absolute after:inset-0"
              >
                {row.productTitle}
              </Link>
              <p className="text-subtle text-xs">{termsText(row.policy)}</p>
            </div>
            <CampaignStateKeyChip stateKey={merchantRowStateKey(row)} />
          </div>
          <div className="flex items-end justify-between gap-4">
            <Budget row={row} />
            <p className="text-subtle shrink-0 text-xs">
              {row.pendingSales} pending · {row.sales.finalized} settled
            </p>
          </div>
          <div className="relative z-10">
            <CampaignRowActions ctx={ctxOf(row)} name={row.productTitle} />
          </div>
        </li>
      ))}
    </ul>
  );
}
