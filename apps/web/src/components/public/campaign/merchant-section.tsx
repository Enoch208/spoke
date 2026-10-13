"use client";

import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { CampaignCard } from "@/components/product/campaign-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { campaignCopy } from "../copy/campaign";
import { formatMonthYear } from "../shared/dates";

export function MerchantSection({ slug, campaignId }: { slug: string; campaignId: string }) {
  const merchant = useClientQuery("merchants.get", { slug });
  const record = useClientQuery("merchants.record", { slug });
  const offers = useClientQuery("merchants.offers", { slug, limit: 4 });
  const more = (offers.data?.items ?? [])
    .filter((offer) => offer.campaignId !== campaignId)
    .slice(0, 3);
  return (
    <div className="flex flex-col gap-4">
      <Card padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {merchant.data ? (
          <>
            <Avatar seed={merchant.data.slug} name={merchant.data.name} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-display text-h4 text-ink truncate font-medium">
                {merchant.data.name}
              </p>
              <p className="text-body flex items-center gap-1.5 text-sm">
                <HugeiconsIcon
                  icon={CheckmarkBadge01Icon}
                  size={16}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="text-lime-ink shrink-0"
                />
                {campaignCopy.merchantCard.walletSigned}
              </p>
              <p className="text-subtle text-sm">
                {fill(campaignCopy.merchantCard.since, {
                  date: formatMonthYear(merchant.data.joinedAt),
                })}
                {record.data
                  ? ` · ${fill(campaignCopy.record, {
                      settled: formatCount(record.data.sales.finalized),
                      refunded: formatCount(record.data.sales.refunded),
                    })}`
                  : ""}
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href={routeTo.merchant(slug)}>{campaignCopy.merchantCard.view}</Link>
            </Button>
          </>
        ) : (
          <Skeleton className="h-14 w-full" />
        )}
      </Card>
      {more.length > 0 && merchant.data ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-h4 text-ink font-medium">
            {fill(campaignCopy.merchantCard.more, { merchant: merchant.data.name })}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((offer) => (
              <CampaignCard key={offer.campaignId} campaign={offer} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
