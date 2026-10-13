"use client";

import { Link01Icon, MailLock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { CampaignCard, type CampaignCardData } from "@/components/product/campaign-card";
import { isInvitationOnly } from "@/components/public/shared/policy-math";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { campaignStateKey } from "@/lib/domain/campaign-state";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { opportunitiesCopy } from "../copy/opportunities";
import type { LinkRow } from "../shared/campaigns";

const copy = opportunitiesCopy.card;

const blockedLabel = (campaign: CampaignCardData) => {
  const key = campaignStateKey(campaign);
  if (key === "paused") return copy.paused;
  if (key === "ended" || key === "expired") return copy.ended;
  if (key === "exhausted") return copy.exhausted;
  if (key === "notFunded" || key === "notLiveYet" || key === "draft") return copy.notOpen;
  return null;
};

export function EarnCampaignCard({
  campaign,
  link,
  invited,
}: {
  campaign: CampaignCardData;
  link: LinkRow | undefined;
  invited: boolean;
}) {
  const open = useUiStore((state) => state.open);
  const blocked = blockedLabel(campaign);
  const closedCohort = isInvitationOnly(campaign.policy) && !invited;
  const footer = link ? (
    <div className="flex items-center gap-2">
      <Badge tone="lime" icon={Link01Icon}>
        {copy.joined}
      </Badge>
      <Button asChild size="sm" variant="secondary" className="flex-1">
        <Link href={routeTo.link(link.nodeId)}>{copy.open}</Link>
      </Button>
    </div>
  ) : closedCohort ? (
    <p className="text-subtle bg-soft flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
      <HugeiconsIcon icon={MailLock01Icon} size={16} strokeWidth={1.8} aria-hidden="true" />
      {copy.invited}
    </p>
  ) : (
    <Button
      block
      size="sm"
      disabled={blocked !== null}
      onClick={() => open("M-12", { campaignId: campaign.campaignId })}
    >
      {blocked ?? copy.create}
    </Button>
  );
  return <CampaignCard campaign={campaign} footer={footer} />;
}
