import { Alert02Icon, BatteryEmptyIcon, HourglassIcon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { fill } from "@/lib/copy";
import { merchantRowStateKey } from "@/lib/domain/campaign-state";
import { formatRelative } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { overviewPageCopy as copy } from "../copy/overview";
import type { MerchantCampaignRow } from "../shared/campaign-rules";
import { fullRewardsCovered, isExhausted, isLowBudget } from "../shared/ledger";

export type Alert = {
  key: string;
  icon: IconSvgElement;
  tone: string;
  text: string;
  action: { label: string; href: string } | { label: string; run: () => void };
};

export const dayMs = 86_400_000;
const ui = useUiStore.getState;

export const plural = (n: number, one: string, many: string) =>
  n === 1 ? one : fill(many, { n: String(n) });

export const campaignAlerts = (campaigns: readonly MerchantCampaignRow[], now: number) => {
  const alerts: Alert[] = [];
  const unfinished: (MerchantCampaignRow & { campaignId: string })[] = [];
  for (const row of campaigns) {
    if (row.campaignId === null) continue;
    const key = merchantRowStateKey(row);
    const available = BigInt(row.availableRewards);
    const reward = BigInt(row.rewardPerSale);
    const name = row.productTitle;
    const id = row.campaignId;
    const topUp = {
      label: copy.actions.addBudget,
      run: () => ui().open("M-23", { campaignId: id }),
    };
    if (key === "notFunded" || key === "notLiveYet") unfinished.push({ ...row, campaignId: id });
    else if (key === "exhausted" || (key === "live" && isExhausted(available, reward)))
      alerts.push({
        key: `ex-${id}`,
        icon: BatteryEmptyIcon,
        tone: "text-pink-ink",
        text: fill(copy.alerts.exhausted, { campaign: name }),
        action: topUp,
      });
    else if (
      (key === "live" || key === "paused") &&
      isLowBudget(available, reward, row.budgetAlertSales)
    ) {
      const n = fullRewardsCovered(available, reward) ?? 0n;
      alerts.push({
        key: `low-${id}`,
        icon: Alert02Icon,
        tone: "text-amber-ink",
        text:
          n === 1n
            ? fill(copy.alerts.lowOne, { campaign: name })
            : fill(copy.alerts.low, { campaign: name, n: n.toString() }),
        action: topUp,
      });
    }
    const ends = Date.parse(row.endsAt);
    if (key === "live" && ends > now && ends - now < 7 * dayMs)
      alerts.push({
        key: `end-${id}`,
        icon: HourglassIcon,
        tone: "text-subtle",
        text: fill(copy.alerts.ending, {
          campaign: name,
          relative: formatRelative(new Date(ends), { now: new Date(now) }),
        }),
        action: { label: copy.actions.open, href: routeTo.sellCampaign(id) },
      });
  }
  return { alerts, unfinished };
};
