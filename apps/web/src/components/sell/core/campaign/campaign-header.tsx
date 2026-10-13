"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import type { CampaignDetail } from "@spoke/protocol";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { Button } from "@/components/ui/button";
import { fill, type CampaignStateKey } from "@/lib/copy";
import { formatAmount, formatBps, formatDateTime, formatDuration, formatSplit } from "@/lib/format";
import { campaignCopy as copy } from "../copy/campaign";
import { ActionMenu } from "../shared/action-menu";
import { useCampaignActions } from "../shared/campaign-actions";
import { Callout } from "../shared/callout";

export const termsLine = (data: CampaignDetail) => {
  const policy = data.policy;
  return [
    formatBps(policy.commissionBps),
    fill(copy.terms.cap, { cap: formatAmount(BigInt(policy.perSaleCap), data.token) }),
    policy.maxRewardedAncestors === 1
      ? copy.terms.levelOne
      : fill(copy.terms.levels, {
          n: String(policy.maxRewardedAncestors),
          split: formatSplit(policy.weightsBps),
        }),
    policy.shortPathMode === "RENORMALIZE_EXISTING"
      ? copy.terms.renormalize
      : copy.terms.returnUnused,
    fill(copy.terms.hold, { hold: formatDuration(policy.holdSeconds) }),
    fill(copy.terms.ends, { date: formatDateTime(new Date(data.endsAt)) }),
  ];
};

export function CampaignHeaderActions({
  campaignId,
  stateKey,
  available,
}: {
  campaignId: string;
  stateKey: CampaignStateKey;
  available: bigint;
}) {
  const actions = useCampaignActions({ campaignId, stateKey, available });
  const buttons = [
    ...(actions.primary ? [actions.primary] : []),
    ...actions.money.filter((item) => item.key === "pause" || item.key === "topUp"),
  ];
  const overflow = [
    ...actions.money.filter((item) => !buttons.includes(item)),
    ...actions.shared,
    ...(actions.end ? [actions.end] : []),
  ];
  return (
    <>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {buttons.map((item, index) =>
          item.onSelect ? (
            <Button
              key={item.key}
              variant={index === 0 ? "primary" : "secondary"}
              {...(item.icon ? { icon: item.icon } : {})}
              onClick={item.onSelect}
            >
              {item.label}
            </Button>
          ) : null,
        )}
        <ActionMenu
          label={copy.more}
          items={overflow}
          trigger={
            <Button variant="secondary" icon={MoreHorizontalIcon}>
              {copy.more}
            </Button>
          }
        />
      </div>
      <div className="sm:hidden">
        <ActionMenu
          label={copy.actions}
          items={[...buttons, ...overflow]}
          showTitle
          trigger={
            <Button variant="secondary" icon={MoreHorizontalIcon}>
              {copy.actions}
            </Button>
          }
        />
      </div>
    </>
  );
}

export function CampaignSubhead({ data }: { data: CampaignDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CampaignStateChip campaign={data} size="md" />
      {termsLine(data).map((part) => (
        <span
          key={part}
          className="bg-pill text-body inline-flex h-7 items-center rounded-full px-2.5 text-sm whitespace-nowrap"
        >
          {part}
        </span>
      ))}
    </div>
  );
}

export function StateBanner({
  stateKey,
  campaignId,
  available,
}: {
  stateKey: CampaignStateKey;
  campaignId: string;
  available: bigint;
}) {
  const actions = useCampaignActions({ campaignId, stateKey, available });
  const banner =
    stateKey === "paused"
      ? { tone: "caution" as const, text: copy.banners.paused }
      : stateKey === "exhausted"
        ? { tone: "danger" as const, text: copy.banners.exhausted }
        : stateKey === "ended" || stateKey === "expired"
          ? { tone: "lock" as const, text: copy.banners.ended }
          : stateKey === "notFunded"
            ? { tone: "caution" as const, text: copy.banners.notFunded }
            : stateKey === "notLiveYet"
              ? { tone: "caution" as const, text: copy.banners.notLiveYet }
              : null;
  if (!banner) return null;
  const run = actions.primary?.onSelect;
  return (
    <Callout
      tone={banner.tone}
      action={
        run ? (
          <Button size="sm" variant="secondary" onClick={run}>
            {actions.primary?.label}
          </Button>
        ) : null
      }
    >
      {banner.text}
    </Callout>
  );
}
