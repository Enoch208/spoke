import { discoverNav, navForArea, type NavItem } from "../nav";
import type { ShellArea } from "./use-area";

export type SidebarGroup = { id: string; label: string; items: readonly NavItem[] };

const sections: Record<
  ShellArea,
  readonly { id: string; label: string; ids: readonly string[] }[]
> = {
  earn: [
    {
      id: "earn-workspace",
      label: "Earn",
      ids: ["earn-home", "earn-opportunities", "earn-purchases"],
    },
    {
      id: "earn-distribution",
      label: "Distribution",
      ids: ["earn-links", "earn-network", "earn-invitations", "earn-communities", "earn-private"],
    },
    {
      id: "earn-record",
      label: "Earnings & record",
      ids: ["earn-earnings", "earn-payouts", "earn-reputation"],
    },
  ],
  sell: [
    {
      id: "sell-workspace",
      label: "Workspace",
      ids: ["sell-overview", "sell-products", "sell-campaigns", "sell-studio"],
    },
    {
      id: "sell-finances",
      label: "Finances",
      ids: ["sell-sales", "sell-vault", "sell-reports", "sell-disputes", "sell-billing"],
    },
    {
      id: "sell-growth",
      label: "Growth",
      ids: ["sell-partners", "sell-analytics", "sell-partnerships", "sell-subscriptions"],
    },
    {
      id: "sell-manage",
      label: "Manage",
      ids: ["sell-integrations", "sell-developers", "sell-team", "sell-settings"],
    },
  ],
  ops: [
    { id: "ops-review", label: "Review", ids: ["ops-queue", "ops-moderation"] },
    { id: "ops-system", label: "Operations", ids: ["ops-audit", "ops-health"] },
  ],
};

export const sidebarGroupsFor = (area: ShellArea): SidebarGroup[] => [
  { id: "discover", label: "Discover", items: discoverNav },
  ...sections[area].map(({ id, label, ids }) => ({
    id,
    label,
    items: ids.flatMap((id) => navForArea(area).filter((item) => item.id === id)),
  })),
];
