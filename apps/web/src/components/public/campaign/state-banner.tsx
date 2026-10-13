"use client";

import { Calendar03Icon, Clock01Icon, MailLock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { CampaignDetail, ClientOutput } from "@spoke/protocol";
import Link from "next/link";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { campaignStateCopy, common, fill, type CampaignStateKey } from "@/lib/copy";
import { formatDateTime, formatRelative, pluralize } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { actionCopy, availabilityCopy } from "../copy/availability";
import { Callout, type CalloutTone } from "../shared/callout";
import { endsSoon, rewardAtPrice, salesLeft } from "../shared/policy-math";
import type { AvailabilityKey } from "./availability";
import type { CampaignViewer } from "./use-campaign-viewer";

const lowBudgetSales = 5n;

const chipKeys: Record<AvailabilityKey, CampaignStateKey> = {
  hidden: "hidden",
  draft: "draft",
  notOpenYet: "notFunded",
  paused: "paused",
  ended: "ended",
  expired: "expired",
  salesLimit: "full",
  exhausted: "exhausted",
  live: "live",
};

export function AvailabilityChip({ availability }: { availability: AvailabilityKey }) {
  const copy = campaignStateCopy[chipKeys[availability]];
  return <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} size="md" />;
}

function Flag({
  icon,
  tone,
  children,
}: {
  icon: IconSvgElement;
  tone: "amber" | "lilac" | "sky";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cx(
        "flex items-start gap-1.5 text-sm",
        tone === "amber" && "text-amber-ink",
        tone === "lilac" && "text-lilac-deep",
        tone === "sky" && "text-sky-ink",
      )}
    >
      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.8}
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      />
      <span>{children}</span>
    </p>
  );
}

export function StateFlags({
  campaign,
  policy,
  availability,
  now,
}: {
  campaign: CampaignDetail;
  policy: ClientOutput<"campaigns.policy"> | undefined;
  availability: AvailabilityKey;
  now: number;
}) {
  const endsAt = new Date(campaign.endsAt);
  const reward = rewardAtPrice(BigInt(campaign.price), campaign.policy);
  const left = salesLeft(BigInt(campaign.rewardAvailable), reward);
  const open = availability === "live" || availability === "exhausted";
  const scheduled = policy?.scheduled;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <AvailabilityChip availability={availability} />
      </div>
      {open && endsSoon(endsAt, new Date(now)) ? (
        <Flag icon={Clock01Icon} tone="amber">
          {fill(actionCopy.endsIn, { relative: formatRelative(endsAt, { now: new Date(now) }) })}
        </Flag>
      ) : null}
      {availability === "live" && left < lowBudgetSales ? (
        <Flag icon={Clock01Icon} tone="amber">
          {fill(actionCopy.budgetLow, { sales: pluralize(left, "more sale") })}
        </Flag>
      ) : null}
      {campaign.inviteOnly ? (
        <Flag icon={MailLock01Icon} tone="lilac">
          <span className="font-medium">{actionCopy.invitationOnly}</span> ·{" "}
          {actionCopy.invitationLine}
        </Flag>
      ) : null}
      {scheduled && (open || availability === "paused") ? (
        <Flag icon={Calendar03Icon} tone="sky">
          {fill(actionCopy.newTerms, { date: formatDateTime(new Date(scheduled.effectiveAt)) })}.{" "}
          {actionCopy.newTermsLine}{" "}
          <a href="#terms" className="underline underline-offset-2">
            {actionCopy.seeChanges}
          </a>
        </Flag>
      ) : null}
    </div>
  );
}

const stateTones: Record<Exclude<AvailabilityKey, "live">, CalloutTone> = {
  hidden: "danger",
  draft: "neutral",
  notOpenYet: "neutral",
  paused: "caution",
  ended: "neutral",
  expired: "neutral",
  salesLimit: "neutral",
  exhausted: "danger",
};

export function StateCallout({
  campaign,
  availability,
  viewer,
  termsFailed,
  retryTerms,
  body = null,
  showOwnLink = true,
}: {
  campaign: CampaignDetail;
  availability: AvailabilityKey;
  viewer: CampaignViewer;
  termsFailed: boolean;
  retryTerms: () => void;
  body?: string | null;
  showOwnLink?: boolean;
}) {
  if (viewer.isMerchant)
    return (
      <Callout
        tone="info"
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href={routeTo.sellCampaign(campaign.campaignId)}>
              {actionCopy.manageCampaign}
            </Link>
          </Button>
        }
      >
        {actionCopy.merchantCallout}
      </Callout>
    );
  if (termsFailed)
    return (
      <Callout
        tone="danger"
        actions={
          <Button size="sm" variant="secondary" onClick={retryTerms}>
            {common.tryAgain}
          </Button>
        }
      >
        {actionCopy.termsUnavailable}
      </Callout>
    );
  if (viewer.ownLink && showOwnLink)
    return <Callout tone="success">{actionCopy.ownLinkStrip}</Callout>;
  if (viewer.selfReferral)
    return (
      <Callout tone="caution" title={actionCopy.selfReferralHeading}>
        {actionCopy.selfReferralBody}
      </Callout>
    );
  if (availability === "live") return null;
  const copy = availabilityCopy[availability];
  const template: string = body ?? copy.body;
  return (
    <Callout tone={stateTones[availability]} title={copy.heading}>
      {fill(template, {
        merchant: campaign.merchant.name,
        date: formatDateTime(new Date(campaign.endsAt)),
        count: String(campaign.capacity.sales),
      })}
    </Callout>
  );
}
