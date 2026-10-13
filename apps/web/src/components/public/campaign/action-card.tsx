"use client";

import type { CampaignDetail, ClientOutput } from "@spoke/protocol";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps, formatCountdown, pluralize, testnetSuffix } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { actionCopy } from "../copy/availability";
import { campaignCopy } from "../copy/campaign";
import { Callout } from "../shared/callout";
import { hasModal } from "../shared/modals-ready";
import { nearestShare } from "../shared/policy-math";
import { ActList } from "./act-list";
import type { AvailabilityKey } from "./availability";
import { StateCallout, StateFlags } from "./state-banner";
import type { CampaignAct } from "./use-campaign-actions";
import type { CampaignViewer } from "./use-campaign-viewer";

export function RewardLines({ campaign }: { campaign: CampaignDetail }) {
  const policy = campaign.policy;
  return (
    <div className="text-body flex flex-col gap-1 text-sm">
      <p>
        {fill(actionCopy.rewardLine, {
          rate: formatBps(policy.commissionBps),
          people: pluralize(policy.maxRewardedAncestors, "person", "people"),
          amount: formatAmount(nearestShare(BigInt(campaign.price), policy), campaign.token),
        })}
      </p>
      <p className="text-subtle">
        {fill(actionCopy.settles, { hold: formatCountdown(policy.holdSeconds) })}
      </p>
    </div>
  );
}

function LowFunds({ campaign, balance }: { campaign: CampaignDetail; balance: bigint }) {
  const open = useUiStore((state) => state.open);
  return (
    <Callout
      tone="caution"
      actions={
        hasModal("M-06") ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              open("M-06", { needSdusdMinor: campaign.price, context: "checkout" });
            }}
          >
            {actionCopy.getTestFunds}
          </Button>
        ) : null
      }
    >
      {fill(actionCopy.lowFunds, {
        balance: formatAmount(balance, campaign.token),
        price: formatAmount(BigInt(campaign.price), campaign.token),
      })}
    </Callout>
  );
}

export function ActionCard({
  campaign,
  policy,
  availability,
  viewer,
  acts,
  notes,
  now,
  code,
  termsFailed,
  retryTerms,
  stateBody,
  inStrip = false,
  children,
}: {
  campaign: CampaignDetail;
  policy: ClientOutput<"campaigns.policy"> | undefined;
  availability: AvailabilityKey;
  viewer: CampaignViewer;
  acts: readonly CampaignAct[];
  notes: readonly string[];
  now: number;
  code: string | null;
  termsFailed: boolean;
  retryTerms: () => void;
  stateBody?: string | null;
  inStrip?: boolean;
  children?: ReactNode;
}) {
  const price = BigInt(campaign.price);
  const short = viewer.balance !== null && viewer.balance < price;
  const buying = acts.some((act) => act.kind === "buy");
  return (
    <div className="bg-pill rounded-3xl p-2">
      <Card padding="lg" className="flex flex-col gap-5">
        {children}
        <StateFlags campaign={campaign} policy={policy} availability={availability} now={now} />
        <StateCallout
          campaign={campaign}
          availability={availability}
          viewer={viewer}
          termsFailed={termsFailed}
          retryTerms={retryTerms}
          body={stateBody ?? null}
          showOwnLink={!inStrip}
        />
        <div>
          <p className="text-subtle text-sm">{campaignCopy.priceLabel}</p>
          <p className="text-ink font-mono text-[32px] leading-tight tabular-nums">
            {formatAmount(price, campaign.token)}
            <span className="font-ui text-subtle text-sm">{testnetSuffix}</span>
          </p>
        </div>
        <div data-campaign-actions="" className="flex flex-col gap-2">
          <ActList acts={acts} campaignId={campaign.campaignId} code={code} layout="stack" />
        </div>
        {notes.length > 0 ? (
          <div className="text-subtle flex flex-col gap-1 text-sm">
            {notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        ) : null}
        {short && buying && viewer.balance !== null ? (
          <LowFunds campaign={campaign} balance={viewer.balance} />
        ) : null}
        <div className="border-hairline border-t pt-4">
          <RewardLines campaign={campaign} />
        </div>
      </Card>
    </div>
  );
}
