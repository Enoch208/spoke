import type { ClientOutput } from "@spoke/protocol";
import { Alert02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { CampaignArt } from "@/components/product/campaign-art";
import { cx } from "@/components/ui/cx";
import { fill, globalStates, required } from "@/lib/copy";
import { createLinkCopy } from "../copy/links";

type Campaign = ClientOutput<"campaigns.get">;
type Join = ClientOutput<"links.previewJoin">;

export function CreateLinkHeader({ campaign, demo }: { campaign: Campaign; demo: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <CampaignArt
        seed={campaign.campaignId}
        imageUrl={campaign.product.media[0]?.url}
        title={campaign.product.title}
        className="size-14 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate font-medium">{campaign.product.title}</p>
        <p className="text-subtle truncate text-sm">
          {campaign.merchant.name}
          {demo ? ` · ${globalStates.demoMode.sampleLabel}` : ""}
        </p>
      </div>
      <CampaignStateChip campaign={campaign} />
    </div>
  );
}

function Callout({ tone, children }: { tone: "info" | "caution"; children: ReactNode }) {
  return (
    <p
      className={cx(
        "flex items-start gap-2 rounded-xl px-4 py-3 text-sm",
        tone === "info" ? "bg-sky-soft text-sky-ink" : "bg-amber-soft text-amber-ink",
      )}
    >
      <HugeiconsIcon
        icon={tone === "info" ? InformationCircleIcon : Alert02Icon}
        size={16}
        strokeWidth={1.8}
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      />
      <span>{children}</span>
    </p>
  );
}

export const eligibilityNotice = (join: Join, merchant: string, fromLink: boolean): ReactNode => {
  switch (join.eligibility) {
    case "already_joined":
      return (
        <Callout tone="info">
          {createLinkCopy.alreadyJoined} {fromLink ? createLinkCopy.cantMove : ""}
        </Callout>
      );
    case "is_merchant":
      return <Callout tone="info">{createLinkCopy.merchant}</Callout>;
    case "invitation_required":
      return <Callout tone="info">{fill(createLinkCopy.inviteOnly, { merchant })}</Callout>;
    case "paused":
      return (
        <Callout tone="caution">
          {required.paused} {createLinkCopy.pausedExtra}
        </Callout>
      );
    case "ended":
      return <Callout tone="caution">{createLinkCopy.ended}</Callout>;
    case "invalid_parent":
      return <Callout tone="caution">{createLinkCopy.invalidParent}</Callout>;
    case "capacity_reached":
      return <Callout tone="caution">{createLinkCopy.capacity}</Callout>;
    case "not_deployed":
      return <Callout tone="caution">{createLinkCopy.notDeployed}</Callout>;
    case "ok":
      if (join.budgetState === "exhausted")
        return (
          <Callout tone="caution">
            {createLinkCopy.exhausted} {fill(createLinkCopy.wontEarn, { merchant })}
          </Callout>
        );
      if (join.budgetState === "unfunded")
        return (
          <Callout tone="caution">
            {required.notFunded} {fill(createLinkCopy.wontEarn, { merchant })}
          </Callout>
        );
      return null;
  }
};
