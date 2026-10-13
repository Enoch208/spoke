"use client";

import Link from "next/link";
import type { CampaignDetail } from "@spoke/protocol";
import { TxHash } from "@/components/ui/address";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-field";
import { KeyValue } from "@/components/ui/key-value";
import { LoadingSkeleton } from "@/components/product/page";
import { fill, toasts, type CampaignStateKey } from "@/lib/copy";
import {
  formatAmount,
  formatBps,
  formatDateTime,
  formatDuration,
  formatSplit,
  shortHash,
} from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useNow } from "@/lib/use-now";
import { activeChain } from "@/lib/wagmi";
import { policyCopy as copy } from "../copy/campaign";
import { Callout } from "../shared/callout";
import { useIsDemo } from "../shared/hooks";
import type { PolicyVersion } from "../shared/policy";

function Hash({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono tabular-nums" title={value}>
        {shortHash(value)}
      </span>
      <CopyButton
        value={value}
        label={label}
        copiedMessage={fill(toasts["T-01"].copy.thing, { thing: label })}
      />
    </span>
  );
}

function Versions({
  list,
  now,
}: {
  list: readonly { v: PolicyVersion; tag: string; live: boolean }[];
  now: number;
}) {
  return (
    <ul className="divide-hairline divide-y">
      {list.map(({ v, tag, live }) => (
        <li key={v.version} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <span className="text-ink font-medium">
              {fill(copy.version, { v: String(v.version) })}
            </span>
            <Badge tone={Date.parse(v.effectiveAt) > now ? "amber" : live ? "lime" : "faint"}>
              {tag}
            </Badge>
          </div>
          <span className="text-subtle text-sm">
            {formatBps(v.commissionBps)} · {formatSplit(v.weightsBps)} ·{" "}
            <Hash value={v.policyHash} label={copy.policyHash} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PolicyTab({
  data,
  stateKey,
}: {
  data: CampaignDetail;
  stateKey: CampaignStateKey;
}) {
  const demo = useIsDemo();
  const now = useNow();
  const policy = useClientQuery("campaigns.policy", { campaignId: data.campaignId });
  if (policy.isPending || !policy.data) return <LoadingSkeleton shape="detail" />;
  const { current, scheduled, history } = policy.data;
  const token = data.token;
  const canChange = stateKey === "live" || stateKey === "exhausted" || stateKey === "paused";
  const versions = [
    ...(scheduled
      ? [
          {
            v: scheduled,
            tag: fill(copy.upcoming, { at: formatDateTime(new Date(scheduled.effectiveAt)) }),
            live: false,
          },
        ]
      : []),
    {
      v: current,
      tag: fill(copy.inEffect, { at: formatDateTime(new Date(current.effectiveAt)) }),
      live: true,
    },
    ...history
      .filter((item) => item.version !== current.version)
      .sort((a, b) => b.version - a.version)
      .map((item) => ({
        v: item,
        tag: fill(copy.previous, { at: formatDateTime(new Date(item.effectiveAt)) }),
        live: false,
      })),
  ];
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card padding="lg" className="min-w-0 xl:col-span-2">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-h4 text-ink font-medium">{copy.current}</h2>
          <Badge>{fill(copy.version, { v: String(current.version) })}</Badge>
        </div>
        <KeyValue
          items={[
            {
              key: "token",
              label: copy.token,
              value: fill(copy.tokenValue, { symbol: token.symbol }),
            },
            { key: "rate", label: copy.rate, value: formatBps(current.commissionBps) },
            {
              key: "cap",
              label: copy.cap,
              value: formatAmount(BigInt(current.perSaleCap), token),
              mono: true,
            },
            {
              key: "limit",
              label: copy.limit,
              value: formatAmount(BigInt(current.campaignLiabilityCap), token),
              mono: true,
            },
            { key: "people", label: copy.people, value: String(current.maxRewardedAncestors) },
            { key: "weights", label: copy.weights, value: formatSplit(current.weightsBps) },
            {
              key: "short",
              label: copy.shortPath,
              value:
                current.shortPathMode === "RENORMALIZE_EXISTING"
                  ? copy.renormalize
                  : copy.returnUnused,
            },
            { key: "hold", label: copy.hold, value: formatDuration(current.holdSeconds) },
            {
              key: "regions",
              label: copy.regions,
              value: current.regions.length ? current.regions.join(", ") : copy.anywhere,
            },
            { key: "access", label: copy.access, value: data.inviteOnly ? copy.invite : copy.open },
            { key: "expiry", label: copy.expiry, value: formatDateTime(new Date(data.endsAt)) },
          ]}
        />
      </Card>
      <div className="min-w-0 space-y-6">
        <Card padding="lg">
          <h2 className="font-display text-h4 text-ink mb-2 font-medium">{copy.hashes}</h2>
          <KeyValue
            items={[
              {
                key: "policy",
                label: copy.policyHash,
                value: <Hash value={current.policyHash} label={copy.policyHash} />,
              },
              {
                key: "eligibility",
                label: copy.eligibilityHash,
                value: <Hash value={current.eligibilityHash} label={copy.eligibilityHash} />,
              },
              {
                key: "sku",
                label: copy.skuHash,
                value: <Hash value={data.product.skuHash} label={copy.skuHash} />,
              },
              {
                key: "created",
                label: copy.created,
                value: <TxHash hash={data.creationTx.hash} chainId={activeChain.id} demo={demo} />,
              },
            ]}
          />
        </Card>
        <Card padding="lg">
          <h2 className="font-display text-h4 text-ink mb-1 font-medium">{copy.versions}</h2>
          <Versions list={versions} now={now} />
        </Card>
      </div>
      <Callout
        tone="lock"
        className="xl:col-span-3"
        action={
          <>
            {canChange ? (
              scheduled ? null : (
                <Button asChild size="sm">
                  <Link href={routeTo.newTerms(data.campaignId)}>{copy.change}</Link>
                </Button>
              )
            ) : null}
            <Button asChild size="sm" variant="secondary">
              <Link href={`/sell/campaigns/new?from=${encodeURIComponent(data.campaignId)}`}>
                {copy.duplicate}
              </Link>
            </Button>
          </>
        }
      >
        {copy.lock}
        {canChange && scheduled ? (
          <span className="mt-1 block">
            {fill(copy.scheduled, { at: formatDateTime(new Date(scheduled.effectiveAt)) })}
          </span>
        ) : null}
      </Callout>
    </div>
  );
}
