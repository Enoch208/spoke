import type { CampaignStateKey } from "@/lib/copy";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { fill } from "@/lib/copy";
import { formatBps, formatSplit } from "@/lib/format";
import { campaignsCopy as copy } from "../copy/campaigns";
import type { MerchantCampaignRow } from "../shared/campaign-rules";
import { fullRewardsCovered } from "../shared/ledger";

export const campaignTabs = ["all", "live", "paused", "drafts", "ended"] as const;
export type CampaignListTab = (typeof campaignTabs)[number];

export const campaignSorts = ["recent", "settled", "budget", "ending"] as const;
export type CampaignSort = (typeof campaignSorts)[number];

const tabOf: Record<CampaignStateKey, CampaignListTab> = {
  draft: "drafts",
  notFunded: "drafts",
  notLiveYet: "drafts",
  live: "live",
  exhausted: "live",
  full: "live",
  hidden: "live",
  paused: "paused",
  ended: "ended",
  expired: "ended",
};

export const listTabOf = (row: MerchantCampaignRow) => tabOf[merchantRowStateKey(row)];

export const termsText = (policy: MerchantCampaignRow["policy"]) =>
  fill(copy.terms, {
    rate: formatBps(policy.commissionBps),
    levels:
      policy.maxRewardedAncestors === 1
        ? copy.levelsOne
        : fill(copy.levelsMany, { n: String(policy.maxRewardedAncestors) }),
    split: formatSplit(policy.weightsBps),
  });

export const coveredText = (available: bigint, reward: bigint) => {
  const covered = fullRewardsCovered(available, reward);
  if (covered === null) return null;
  return covered === 1n ? copy.coveredOne : fill(copy.covered, { n: covered.toString() });
};

const compareBig = (a: bigint, b: bigint) => (a === b ? 0 : a > b ? -1 : 1);

export const sortRows = (rows: readonly MerchantCampaignRow[], sort: CampaignSort) => {
  const copied = [...rows];
  if (sort === "settled") return copied.sort((a, b) => b.sales.finalized - a.sales.finalized);
  if (sort === "budget")
    return copied.sort((a, b) =>
      compareBig(BigInt(a.availableRewards), BigInt(b.availableRewards)),
    );
  if (sort === "ending") return copied.sort((a, b) => a.endsAt.localeCompare(b.endsAt));
  return copied;
};

export const matchesSearch = (row: MerchantCampaignRow, q: string) =>
  !q.trim() || row.productTitle.toLowerCase().includes(q.trim().toLowerCase());
