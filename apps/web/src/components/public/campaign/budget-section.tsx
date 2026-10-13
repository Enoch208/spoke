import type { CampaignDetail } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import { formatAmount, pluralize } from "@/lib/format";
import { campaignCopy } from "../copy/campaign";
import { FreshnessLine } from "../shared/freshness";
import { salesLeft } from "../shared/policy-math";

const parts = [
  { key: "available", label: campaignCopy.budget.available, fill: "bg-lime-deep" },
  { key: "pendingReserved", label: campaignCopy.budget.reserved, fill: "bg-chart-reserved" },
  { key: "vestedUnclaimed", label: campaignCopy.budget.owed, fill: "bg-chart-pending" },
  { key: "rewardsClaimed", label: campaignCopy.budget.claimed, fill: "bg-chart-settled/50" },
] as const;

export function BudgetSection({
  campaign,
  reward,
}: {
  campaign: Pick<CampaignDetail, "rewardLedger" | "token">;
  reward: bigint;
}) {
  const ledger = campaign.rewardLedger;
  const values = parts.map((part) => ({ ...part, value: BigInt(ledger[part.key]) }));
  const whole = values.reduce((sum, part) => sum + part.value, 0n);
  const left = salesLeft(BigInt(ledger.available), reward);
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-h4 text-ink font-medium">{campaignCopy.budget.heading}</h2>
        <FreshnessLine />
      </div>
      <div
        role="img"
        aria-label={campaignCopy.budget.barLabel}
        className="bg-pill flex h-3 w-full overflow-hidden rounded-full"
      >
        {values.map((part) =>
          part.value > 0n && whole > 0n ? (
            <span
              key={part.key}
              className={cx("h-full", part.fill)}
              style={{ flexGrow: Number((part.value * 1000n) / whole) }}
            />
          ) : null,
        )}
      </div>
      <dl className="flex flex-col gap-3">
        {values.map((part) => (
          <div key={part.key} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-body flex items-center gap-2">
              <span aria-hidden="true" className={cx("size-2.5 rounded-full", part.fill)} />
              {part.label}
            </dt>
            <dd className="text-ink font-mono tabular-nums">
              {formatAmount(part.value, campaign.token)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-hairline text-body flex flex-col gap-1 border-t pt-4 text-sm">
        <p className="text-ink font-medium">
          {left > 0n
            ? fill(campaignCopy.budget.salesLeft, { sales: pluralize(left, "more sale") })
            : campaignCopy.budget.noneLeft}
        </p>
        <p>
          {fill(campaignCopy.budget.deposited, {
            amount: formatAmount(BigInt(ledger.netDeposited), campaign.token),
          })}
        </p>
        <p className="text-subtle">{campaignCopy.budget.note}</p>
      </div>
    </Card>
  );
}
