import { StatusChip } from "@/components/ui/status-chip";
import { campaignStateCopy, type CampaignStateKey } from "@/lib/copy";
import { campaignStateKey, type CampaignStateInput } from "@/lib/domain/campaign-state";

export function CampaignStateChip({
  campaign,
  size = "sm",
}: {
  campaign: CampaignStateInput;
  size?: "sm" | "md";
}) {
  const copy = campaignStateCopy[campaignStateKey(campaign)];
  return <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} size={size} />;
}

export function CampaignStateKeyChip({ stateKey }: { stateKey: CampaignStateKey }) {
  const copy = campaignStateCopy[stateKey];
  return <StatusChip label={copy.label} icon={copy.icon} tone={copy.tone} />;
}
