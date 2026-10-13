import type { LinkRow } from "../shared/campaigns";
import { linkStatus, type LinkStatus } from "../shared/link-status";
import type { LinkStats } from "./link-cells";

export const sorts = ["recent", "newest", "sales", "earned"] as const;
export type LinkSort = (typeof sorts)[number];

const salesOf = (stats: LinkStats | undefined) =>
  stats ? stats.sales.pending + stats.sales.finalized : 0;

const earnedOf = (link: LinkRow) => BigInt(link.earned.claimable) + BigInt(link.earned.claimed);

export const applyFilters = (
  items: readonly LinkRow[],
  options: {
    q: string;
    status: LinkStatus | "all";
    merchant: string;
    sort: LinkSort;
    stats: (nodeId: string) => LinkStats | undefined;
  },
) => {
  const needle = options.q.trim().toLowerCase();
  const kept = items.filter(
    (link) =>
      (needle === "" ||
        link.campaign.product.title.toLowerCase().includes(needle) ||
        link.campaign.merchant.name.toLowerCase().includes(needle)) &&
      (options.status === "all" || linkStatus(link) === options.status) &&
      (options.merchant === "all" || link.campaign.merchant.name === options.merchant),
  );
  if (options.sort === "recent") return kept;
  return [...kept].sort((a, b) => {
    if (options.sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    if (options.sort === "sales")
      return salesOf(options.stats(b.nodeId)) - salesOf(options.stats(a.nodeId));
    const diff = earnedOf(b) - earnedOf(a);
    return diff > 0n ? 1 : diff < 0n ? -1 : 0;
  });
};
