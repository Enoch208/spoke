"use client";

import {
  Clock01Icon,
  Link01Icon,
  MailLock01Icon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import type { ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import type { ReactNode } from "react";
import { cardCopy } from "@/components/public/copy/card";
import {
  endsSoon,
  expiryDate,
  isInvitationOnly,
  rewardAtPrice,
  salesLeft,
} from "@/components/public/shared/policy-math";
import { SplitStrip } from "@/components/public/shared/split-strip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useClientContext } from "@/lib/client/provider";
import { fill, globalStates } from "@/lib/copy";
import { formatAmount, formatBps, formatCountdown, formatRelative, pluralize } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { CampaignArt } from "./campaign-art";
import { CampaignStateChip } from "./campaign-state-chip";

export type CampaignCardData = ClientOutput<"campaigns.list">["items"][number];

const permille = (part: bigint, whole: bigint) => (whole > 0n ? Number((part * 1000n) / whole) : 0);

function Budget({ campaign }: { campaign: CampaignCardData }) {
  const available = BigInt(campaign.rewardAvailable);
  const reward = rewardAtPrice(BigInt(campaign.price), campaign.policy);
  const exhausted = available < reward;
  const left = salesLeft(available, reward);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body flex flex-wrap items-baseline gap-x-1.5 text-sm">
        <span>
          {fill(cardCopy.budgetLeft, { available: formatAmount(available, campaign.token) })}
        </span>
        <span className="text-subtle">
          {exhausted
            ? `· ${cardCopy.budgetUsedUp}`
            : `· ${fill(cardCopy.salesLeft, { sales: pluralize(left, "sale") })}`}
        </span>
      </p>
      <ProgressBar
        value={exhausted ? 0 : permille(available, BigInt(campaign.rewardTotal))}
        max={1000}
        label={cardCopy.budgetLabel}
        tone="lime"
      />
    </div>
  );
}

export function CampaignCard({
  campaign,
  hasLink = false,
  purchased = false,
  footer,
}: {
  campaign: CampaignCardData;
  hasLink?: boolean;
  purchased?: boolean;
  footer?: ReactNode;
}) {
  const { mode } = useClientContext();
  const now = new Date(useNow());
  const policy = campaign.policy;
  const price = BigInt(campaign.price);
  const endsAt = expiryDate(policy);
  const image = campaign.product.media.find((asset) => asset.kind === "image")?.url;
  const chips = [
    isInvitationOnly(policy) ? (
      <Badge key="invite" tone="lilac" icon={MailLock01Icon}>
        {cardCopy.invitationOnly}
      </Badge>
    ) : null,
    endsSoon(endsAt, now) ? (
      <Badge key="ends" tone="amber" icon={Clock01Icon}>
        {fill(cardCopy.endsIn, { relative: formatRelative(endsAt, { now }) })}
      </Badge>
    ) : null,
    hasLink ? (
      <Badge key="link" tone="lime" icon={Link01Icon}>
        {cardCopy.yourLink}
      </Badge>
    ) : null,
    purchased ? (
      <Badge key="bought" tone="sky" icon={ShoppingBag01Icon}>
        {cardCopy.purchased}
      </Badge>
    ) : null,
  ].filter(Boolean);
  return (
    <Card
      padding="none"
      className="group has-[a:focus-visible]:outline-ink ease-spring relative flex h-full min-w-0 flex-col overflow-hidden transition-[box-shadow,border-color] duration-[423ms] outline-offset-2 hover:border-line hover:shadow-[0_12px_32px_-16px_rgba(26,26,26,0.18)] has-[a:focus-visible]:outline-2"
    >
      <div className="relative">
        <CampaignArt
          seed={campaign.campaignId}
          imageUrl={image}
          title={campaign.product.title}
          className="aspect-[16/10]"
        />
        <div className="absolute top-3 right-3">
          <CampaignStateChip campaign={campaign} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="min-w-0">
          <h2 className="font-display text-ink line-clamp-2 text-[22px] leading-tight font-medium tracking-[-0.01em]">
            <Link
              href={routeTo.campaign(campaign.campaignId)}
              className="outline-none after:absolute after:inset-0"
            >
              {campaign.product.title}
            </Link>
          </h2>
          <div className="mt-1.5 flex min-w-0 items-center gap-2 text-sm">
            <Link
              href={routeTo.merchant(campaign.merchant.slug)}
              title={campaign.merchant.name}
              className="text-subtle hover:text-ink relative z-10 truncate transition-colors duration-[423ms] ease-spring"
            >
              {campaign.merchant.name}
            </Link>
            {mode === "demo" ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-ink text-sm font-medium">
            {fill(cardCopy.rewardLine, {
              rate: formatBps(policy.commissionBps),
              people: pluralize(policy.maxRewardedAncestors, "person", "people"),
            })}
          </p>
          <p className="text-body text-sm">
            {cardCopy.perSale}:{" "}
            <span className="text-ink font-mono tabular-nums">
              {formatAmount(rewardAtPrice(price, policy), campaign.token)}
            </span>
          </p>
          <SplitStrip weightsBps={policy.weightsBps} className="mt-2" />
        </div>
        <dl className="border-hairline grid grid-cols-2 gap-3 border-t pt-4 text-sm">
          <div className="min-w-0">
            <dt className="text-subtle">{cardCopy.price}</dt>
            <dd className="text-ink truncate font-mono tabular-nums">
              {formatAmount(price, campaign.token)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-subtle">{cardCopy.settles}</dt>
            <dd className="text-ink">{formatCountdown(policy.holdSeconds)}</dd>
          </div>
        </dl>
        <Budget campaign={campaign} />
        {chips.length > 0 ? <div className="flex flex-wrap gap-1.5">{chips}</div> : null}
        {footer ? <div className="relative z-10 mt-auto pt-1">{footer}</div> : null}
      </div>
    </Card>
  );
}
