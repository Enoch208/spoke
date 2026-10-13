"use client";

import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { fill } from "@/lib/copy";
import { formatCount, formatDateTime } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { reputationCopy as copy } from "../copy/reputation";
import { useMyLinks } from "../shared/campaigns";
import { Section } from "../shared/section";

type Profile = ClientOutput<"reputation.mine">;
type Receipt = Profile["evidence"]["items"][number];

function MerchantRow({ receipts, count }: { receipts: readonly Receipt[]; count: number }) {
  const links = useMyLinks();
  const first = receipts[0];
  const known = first ? links.campaignOf(first.campaignId) : undefined;
  const fetched = useClientQuery(
    "campaigns.get",
    { campaignId: first?.campaignId ?? "0" },
    { enabled: !known && first !== undefined },
  );
  const campaign = known ?? fetched.data;
  const last = receipts
    .map((receipt) => receipt.finalizeTx?.at ?? receipt.purchasedAt)
    .sort()
    .at(-1);
  if (!campaign) return null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <Link
        href={routeTo.merchant(campaign.merchant.slug)}
        className="text-ink font-medium hover:underline"
      >
        {campaign.merchant.name}
      </Link>
      <span className="text-subtle text-sm">
        {fill(copy.diversity.sales, { n: formatCount(count) })}
        {last ? ` · ${fill(copy.diversity.last, { date: formatDateTime(new Date(last)) })}` : ""}
      </span>
    </li>
  );
}

export function Diversity({ profile }: { profile: Profile }) {
  const links = useMyLinks();
  const categories = useClientQuery("products.categories", {});
  const byId = new Map(profile.evidence.items.map((receipt) => [receipt.saleId, receipt]));
  const merchants = profile.perMerchant.filter((row) => row.settledConversions > 0);
  const counts = new Map<string, number>();
  for (const row of profile.perCampaign) {
    const category = links.campaignOf(row.campaignId)?.product.category;
    if (category && row.settledConversions > 0)
      counts.set(category, (counts.get(category) ?? 0) + row.settledConversions);
  }
  const name = (id: string) => categories.data?.find((category) => category.id === id)?.name ?? id;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section
        title={copy.diversity.title}
        description={
          merchants.length === 1
            ? copy.diversity.one
            : fill(copy.diversity.line, { n: formatCount(merchants.length) })
        }
      >
        <ul className="divide-hairline divide-y">
          {merchants.map((row) => (
            <MerchantRow
              key={row.merchantId}
              count={row.settledConversions}
              receipts={row.receiptIds.flatMap((id) => {
                const receipt = byId.get(id);
                return receipt ? [receipt] : [];
              })}
            />
          ))}
        </ul>
      </Section>
      <Section title={copy.categories.title}>
        <ul className="flex flex-wrap gap-2">
          {[...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => (
              <li key={id}>
                <Badge tone="ink">{`${name(id)} · ${formatCount(count)}`}</Badge>
              </li>
            ))}
        </ul>
      </Section>
    </div>
  );
}
