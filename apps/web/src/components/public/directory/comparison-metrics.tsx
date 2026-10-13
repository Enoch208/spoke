import { Amount } from "@/components/ui/amount";
import { formatCount, formatDateTime } from "@/lib/format";
import type { AnyProfile } from "../profile/types";
import { comparisonToken } from "./comparison-model";

const count = (value: number | null) => (value === null ? "Not shared" : formatCount(value));

export function ComparisonMetrics({ profile }: { profile: AnyProfile }) {
  const token = comparisonToken(profile);
  const money = (value: string | null) =>
    value === null ? (
      "Not shared"
    ) : token ? (
      <Amount amount={BigInt(value)} token={token} size="sm" testnet />
    ) : (
      "See profile"
    );
  const rows = [
    ["Settled sales", count(profile.settledConversions)],
    ["Direct sales", count(profile.directConversions)],
    ["Network sales", count(profile.networkConversions)],
    ["Distinct merchants", count(profile.merchantCount)],
    ["Campaigns", count(profile.campaignCount)],
    ["Value on paid paths", money(profile.netAttributedValue)],
    ["Refunded rewards", profile.refundAdjustment === null ? "Not shared" : "See profile"],
    [
      "Last settled sale",
      profile.evidencePeriod.to
        ? formatDateTime(new Date(profile.evidencePeriod.to))
        : profile.settledConversions === 0
          ? "No settled sales"
          : "Not shared",
    ],
  ] as const;
  return (
    <dl className="divide-hairline divide-y text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
          <dt className="text-subtle">{label}</dt>
          <dd className="text-ink font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
