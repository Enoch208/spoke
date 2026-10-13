import { StatusChip } from "@/components/ui/status-chip";
import { Tooltip } from "@/components/ui/tooltip";
import { campaignStateKey } from "@/lib/domain/campaign-state";
import { linkStateCopy, type LinkStateKey } from "@/lib/copy";
import { linkStatusCopy } from "../copy/link-list";
import type { LinkRow } from "./campaigns";

export type LinkStatus = "active" | "paused" | "exhausted" | "closed" | "hidden";

export const linkStatus = (link: Pick<LinkRow, "moderation" | "campaign">): LinkStatus => {
  if (link.moderation.state === "hidden") return "hidden";
  const key = campaignStateKey(link.campaign);
  if (key === "live") return "active";
  if (key === "paused") return "paused";
  if (key === "exhausted") return "exhausted";
  return "closed";
};

export const shareBlockedReason = (status: LinkStatus): string | null =>
  status === "active" ? null : linkStatusCopy.blocked[status];

export function LinkStateChip({ status }: { status: LinkStatus }) {
  const key: LinkStateKey = status;
  const copy = linkStateCopy[key];
  return (
    <Tooltip content={copy.explainer}>
      <span tabIndex={0} className="inline-flex rounded-full">
        <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} />
      </span>
    </Tooltip>
  );
}
