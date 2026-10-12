"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { CampaignStateKeyChip } from "@/components/product/campaign-state-chip";
import { fill, vaultRewardCopy, type CampaignStateKey } from "@/lib/copy";
import { formatTokenAmount } from "@spoke/protocol";
import { formatAmount, type TokenLike } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { vaultCopy as copy } from "../copy/vault";
import { canTopUp, canWithdraw } from "../shared/campaign-rules";
import { useActiveTx } from "../shared/hooks";
import {
  fullRewardsCovered,
  rewardBuckets,
  rewardKeys,
  roomUnderLimit,
  type RewardBuckets,
  type VaultCampaign,
} from "../shared/ledger";

export type BudgetRow = {
  entry: VaultCampaign;
  name: string;
  stateKey: CampaignStateKey;
};

const plain = (amount: bigint, token: TokenLike) => formatTokenAmount(amount, token.decimals);

function RowActions({ row, stacked = false }: { row: BudgetRow; stacked?: boolean }) {
  const available = BigInt(row.entry.rewards.available);
  const withdrawing = useActiveTx(`withdrawUnused:${row.entry.campaignId}`);
  const exhausted = row.stateKey === "exhausted";
  return (
    <div className={stacked ? "flex flex-col items-end gap-2" : "flex flex-wrap justify-end gap-2"}>
      {canTopUp(row.stateKey) ? (
        <Button
          size="sm"
          variant={exhausted ? "primary" : "secondary"}
          onClick={() => {
            useUiStore.getState().open("M-23", { campaignId: row.entry.campaignId });
          }}
        >
          {copy.addBudget}
        </Button>
      ) : null}
      {canWithdraw(row.stateKey, available) ? (
        <Button
          size="sm"
          variant="secondary"
          loading={withdrawing}
          loadingLabel="Waiting for confirmation…"
          onClick={() => {
            useUiStore.getState().open("M-24", { campaignId: row.entry.campaignId });
          }}
        >
          {copy.withdraw}
        </Button>
      ) : null}
    </div>
  );
}

export const coveredText = (available: bigint, rewardPerSale: bigint) => {
  const covered = fullRewardsCovered(available, rewardPerSale);
  if (covered === null) return "—";
  return covered === 1n ? copy.coveredOne : fill(copy.coveredValue, { n: covered.toString() });
};

const entryCovered = (entry: VaultCampaign) =>
  coveredText(BigInt(entry.rewards.available), BigInt(entry.rewardPerSale));

export function CampaignBudgets({
  rows,
  totals,
  token,
}: {
  rows: readonly BudgetRow[];
  totals: RewardBuckets;
  token: TokenLike;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 className="font-display text-h4 text-ink font-medium">{copy.campaigns}</h2>
        <p className="text-subtle hidden text-sm lg:block">
          {fill(copy.amountsIn, { symbol: `${token.symbol} · testnet` })}
        </p>
      </header>
      <Table caption={copy.campaignsCaption} className="hidden lg:block">
        <THead>
          <tr>
            <Th>Campaign</Th>
            <Th numeric>{vaultRewardCopy.netDeposited.label}</Th>
            {rewardKeys.map((key) => (
              <Th key={key} numeric className="leading-tight whitespace-normal!">
                {vaultRewardCopy[key].label}
              </Th>
            ))}
            <Th numeric className="leading-tight whitespace-normal!">
              {copy.covered}
            </Th>
            <Th numeric className="leading-tight whitespace-normal!">
              {copy.room}
            </Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </THead>
        <TBody>
          {rows.map((row) => {
            const buckets = rewardBuckets(row.entry.rewards);
            return (
              <Tr key={row.entry.campaignId}>
                <Td className="max-w-40">
                  <Link
                    href={`/sell/campaigns/${row.entry.campaignId}?tab=budget`}
                    title={row.name}
                    className="text-ink block truncate font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                  <div className="mt-1">
                    <CampaignStateKeyChip stateKey={row.stateKey} />
                  </div>
                </Td>
                <Td numeric>{plain(buckets.netDeposited, token)}</Td>
                {rewardKeys.map((key) => (
                  <Td key={key} numeric>
                    {plain(buckets[key], token)}
                  </Td>
                ))}
                <Td numeric className="font-ui text-body whitespace-nowrap">
                  {entryCovered(row.entry)}
                </Td>
                <Td numeric>
                  {plain(roomUnderLimit(BigInt(row.entry.liabilityCap), buckets), token)}
                </Td>
                <Td>
                  <RowActions row={row} stacked />
                </Td>
              </Tr>
            );
          })}
          <tr className="bg-soft">
            <Td className="font-medium">{copy.totals}</Td>
            <Td numeric className="font-medium">
              {plain(totals.netDeposited, token)}
            </Td>
            {rewardKeys.map((key) => (
              <Td key={key} numeric className="font-medium">
                {plain(totals[key], token)}
              </Td>
            ))}
            <Td />
            <Td />
            <Td />
          </tr>
        </TBody>
      </Table>
      <ul className="divide-hairline divide-y lg:hidden">
        {rows.map((row) => {
          const buckets = rewardBuckets(row.entry.rewards);
          return (
            <li key={row.entry.campaignId} className="space-y-3 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/sell/campaigns/${row.entry.campaignId}?tab=budget`}
                  className="text-ink min-w-0 font-medium hover:underline"
                >
                  {row.name}
                </Link>
                <CampaignStateKeyChip stateKey={row.stateKey} />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {(["available", "pendingReserved", "vestedUnclaimed"] as const).map((key) => (
                  <div key={key}>
                    <dt className="text-subtle">{vaultRewardCopy[key].label}</dt>
                    <dd className="text-ink font-mono tabular-nums">
                      {formatAmount(buckets[key], token)}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-subtle">{copy.covered}</dt>
                  <dd className="text-ink">{entryCovered(row.entry)}</dd>
                </div>
              </dl>
              <RowActions row={row} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
