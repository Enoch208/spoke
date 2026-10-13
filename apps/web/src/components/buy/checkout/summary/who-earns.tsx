"use client";

import { LockKeyIcon } from "@hugeicons/core-free-icons";
import { BPS_DENOMINATOR, type ClientOutput } from "@spoke/protocol";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/status-chip";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps, formatPerson, formatSplit, numberWord } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { checkoutCopy } from "../../copy/checkout";
import { splitSentence, type SplitSentence } from "../split";
import { Disclosure } from "./disclosure";

type Campaign = ClientOutput<"campaigns.get">;
type Preview = ClientOutput<"checkout.preview">;

const sentenceText = (sentence: SplitSentence, campaign: Campaign) => {
  const count = sentence.split.length;
  const split = formatSplit(sentence.split);
  if (sentence.kind === "full")
    return count === 1
      ? checkoutCopy.fullPathOne
      : fill(checkoutCopy.fullPath, { split, count: numberWord(count) });
  if (sentence.kind === "renormalized")
    return count === 1
      ? checkoutCopy.shortRenormalizeOne
      : fill(checkoutCopy.shortRenormalize, { split, count: numberWord(count) });
  return fill(checkoutCopy.shortReturn, {
    count: numberWord(count),
    split,
    unallocated: formatAmount(sentence.unallocated, campaign.token),
  });
};

const basisOf = (campaign: Campaign) => {
  const policy = campaign.policy;
  const gross = (BigInt(campaign.price) * BigInt(policy.commissionBps)) / BPS_DENOMINATOR;
  return gross > BigInt(policy.perSaleCap)
    ? checkoutCopy.basisCapped
    : fill(checkoutCopy.basisRate, { rate: formatBps(policy.commissionBps) });
};

export function WhoEarns({
  campaign,
  preview,
  nodeId,
  chainLength,
  referrer,
  collapsible,
}: {
  campaign: Campaign;
  preview: Preview;
  nodeId: string;
  chainLength: number | null;
  referrer: string | null;
  collapsible: boolean;
}) {
  const reward = formatAmount(BigInt(preview.rewardTotal), campaign.token);
  const recipients = preview.recipients;
  const max = campaign.policy.maxRewardedAncestors;
  const outside = chainLength === null ? 0 : Math.max(0, chainLength - max);
  const sentence = splitSentence(preview, campaign.policy);
  const others = recipients.length - 1;
  const summary =
    recipients.length === 0
      ? checkoutCopy.directWhoEarns
      : others === 0
        ? fill(checkoutCopy.whoEarnsCollapsedOne, {
            referrer: referrer ?? checkoutCopy.aLink,
            reward,
          })
        : fill(checkoutCopy.whoEarnsCollapsed, {
            referrer: referrer ?? checkoutCopy.aLink,
            others:
              others === 1
                ? checkoutCopy.othersOne
                : fill(checkoutCopy.othersMany, { n: String(others) }),
            reward,
          });
  const body =
    recipients.length === 0 ? (
      <p className="text-body text-sm">{checkoutCopy.directWhoEarns}</p>
    ) : (
      <div className="flex flex-col gap-4">
        <p className="text-body text-sm">
          {checkoutCopy.rewardTotal}{" "}
          <span className="text-ink font-mono tabular-nums">{reward}</span> · {basisOf(campaign)}
        </p>
        <ol className="divide-hairline border-hairline divide-y border-y">
          {recipients.map((recipient, index) => (
            <li key={recipient.nodeId} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar
                seed={recipient.creator.address ?? recipient.nodeId}
                name={recipient.creator.handle ?? recipient.creator.displayName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-ink truncate text-sm font-medium">
                  {formatPerson(recipient.creator)}
                </p>
                <p className="text-subtle text-sm">
                  {index === 0
                    ? checkoutCopy.levelOne
                    : fill(checkoutCopy.level, { level: String(index + 1) })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-ink font-mono text-sm tabular-nums">
                  {formatBps(recipient.effectiveWeightBps)} ·{" "}
                  {formatAmount(BigInt(recipient.amount), campaign.token)}
                </p>
                <span className="flex items-center gap-2">
                  <span className="text-subtle hidden text-sm sm:inline">
                    {checkoutCopy.reservedCaption}
                  </span>
                  <StatusChip label={checkoutCopy.reserved} icon={LockKeyIcon} tone="lilac" />
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className="text-body flex flex-col gap-2 text-sm">
          {sentence ? <p>{sentenceText(sentence, campaign)}</p> : null}
          {outside > 0 ? (
            <p>
              {outside === 1
                ? fill(checkoutCopy.outsideWindowOne, { max: String(max) })
                : fill(checkoutCopy.outsideWindow, { n: String(outside), max: String(max) })}
            </p>
          ) : null}
          <p className="text-subtle">{checkoutCopy.attribution}</p>
        </div>
        <a
          href={`${routeTo.campaignNetwork(campaign.campaignId)}?node=${encodeURIComponent(nodeId)}`}
          target="_blank"
          rel="noreferrer"
          className="text-ink self-start text-sm font-medium underline underline-offset-2"
        >
          {checkoutCopy.seePath}
        </a>
      </div>
    );
  return (
    <Disclosure
      title={checkoutCopy.whoEarns}
      summary={summary}
      collapsible={collapsible && recipients.length > 0}
    >
      {body}
    </Disclosure>
  );
}
