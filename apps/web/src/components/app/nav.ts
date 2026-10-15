import {
  Activity01Icon,
  Compass01Icon,
  Agreement01Icon,
  Analytics01Icon,
  Award01Icon,
  ClipboardIcon,
  CodeIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  FileExportIcon,
  Flag01Icon,
  HelpCircleIcon,
  Home01Icon,
  Invoice01Icon,
  JusticeScale01Icon,
  Link01Icon,
  Mail01Icon,
  Megaphone01Icon,
  MoneyReceive01Icon,
  Notification01Icon,
  Package01Icon,
  PlugSocketIcon,
  RepeatIcon,
  Route01Icon,
  SafeIcon,
  Search01Icon,
  Settings01Icon,
  Shield01Icon,
  ShoppingBag01Icon,
  SlidersHorizontalIcon,
  Store01Icon,
  Task01Icon,
  UserAccountIcon,
  UserGroupIcon,
  UserMultipleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { FeatureKey } from "@/lib/features";
import { routes } from "@/lib/routes";

export type NavArea = "earn" | "sell" | "ops" | "account" | "discover";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: IconSvgElement;
  area: NavArea;
  feature: FeatureKey | null;
};

const item = (
  area: NavArea,
  id: string,
  label: string,
  href: string,
  icon: IconSvgElement,
  feature: FeatureKey | null = null,
): NavItem => ({ id, label, href, icon, area, feature });

export const discoverNav: readonly NavItem[] = [
  item("discover", "discover-explore", "Explore", routes.explore, Compass01Icon),
  item("discover", "discover-distributors", "Distributors", routes.distributors, UserMultipleIcon),
];

export const earnNav: readonly NavItem[] = [
  item("earn", "earn-home", "Home", routes.earn.home, Home01Icon, "earnDashboard"),
  item(
    "earn",
    "earn-opportunities",
    "Opportunities",
    routes.earn.opportunities,
    Search01Icon,
    "discovery",
  ),
  item("earn", "earn-private", "Private workspace", routes.earn.workspace, SafeIcon),
  item("earn", "earn-links", "Links", routes.earn.links, Link01Icon, "links"),
  item("earn", "earn-network", "Network", routes.earn.network, Route01Icon, "graph"),
  item(
    "earn",
    "earn-earnings",
    "Earnings",
    routes.earn.earnings,
    MoneyReceive01Icon,
    "earnDashboard",
  ),
  item("earn", "earn-payouts", "Payouts", routes.earn.payouts, Wallet01Icon, "settlement"),
  item("earn", "earn-reputation", "Reputation", routes.earn.reputation, Award01Icon, "reputation"),
  item(
    "earn",
    "earn-invitations",
    "Invitations",
    routes.earn.invitations,
    Mail01Icon,
    "invitations",
  ),
  item(
    "earn",
    "earn-communities",
    "Communities",
    routes.earn.communities,
    UserGroupIcon,
    "communities",
  ),
  item("earn", "earn-purchases", "Purchases", routes.purchases, ShoppingBag01Icon, "checkout"),
];

export const sellNav: readonly NavItem[] = [
  item(
    "sell",
    "sell-overview",
    "Overview",
    routes.sell.overview,
    DashboardSquare01Icon,
    "sellDashboard",
  ),
  item("sell", "sell-campaigns", "Campaigns", routes.sell.campaigns, Megaphone01Icon, "composer"),
  item("sell", "sell-products", "Products", routes.sell.products, Package01Icon, "catalog"),
  item("sell", "sell-sales", "Sales", routes.sell.sales, Invoice01Icon, "settlement"),
  item("sell", "sell-vault", "Vault", routes.sell.vault, SafeIcon, "vault"),
  item(
    "sell",
    "sell-partners",
    "Partners",
    routes.sell.partners,
    UserMultipleIcon,
    "partnerDiscovery",
  ),
  item("sell", "sell-analytics", "Analytics", routes.sell.analytics, Analytics01Icon, "analytics"),
  item(
    "sell",
    "sell-studio",
    "Commission Studio",
    routes.sell.studio,
    SlidersHorizontalIcon,
    "composer",
  ),
  item(
    "sell",
    "sell-integrations",
    "Integrations",
    routes.sell.integrations,
    PlugSocketIcon,
    "shopify",
  ),
  item("sell", "sell-developers", "Developers", routes.sell.developers, CodeIcon, "apiKeys"),
  item("sell", "sell-team", "Team", routes.sell.team, UserAccountIcon, "team"),
  item("sell", "sell-reports", "Reports", routes.sell.reports, FileExportIcon, "sellDashboard"),
  item("sell", "sell-disputes", "Disputes", routes.sell.disputes, JusticeScale01Icon, "settlement"),
  item(
    "sell",
    "sell-subscriptions",
    "Subscriptions",
    routes.sell.subscriptions,
    RepeatIcon,
    "subscriptions",
  ),
  item(
    "sell",
    "sell-partnerships",
    "Partnerships",
    routes.sell.partnerships,
    Agreement01Icon,
    "partnerships",
  ),
  item("sell", "sell-billing", "Billing", routes.sell.billing, CreditCardIcon, null),
  item("sell", "sell-settings", "Settings", routes.sell.settings, Store01Icon, null),
];

export const opsNav: readonly NavItem[] = [
  item("ops", "ops-queue", "Queue", routes.ops.queue, Task01Icon, "risk"),
  item("ops", "ops-moderation", "Moderation", routes.ops.moderation, Flag01Icon, "riskReview"),
  item("ops", "ops-audit", "Audit log", routes.ops.audit, ClipboardIcon, "opsHealth"),
  item("ops", "ops-health", "Health", routes.ops.health, Activity01Icon, "opsHealth"),
];

export const accountNav: readonly NavItem[] = [
  item("account", "settings", "Settings", routes.settings.profile, Settings01Icon),
  item("account", "security", "Security", routes.settings.security, Shield01Icon),
  item("account", "wallet", "Wallet", routes.wallet, Wallet01Icon, "gasSponsorship"),
  item("account", "notifications", "Notifications", routes.notifications, Notification01Icon),
  item("account", "help", "Help", routes.support, HelpCircleIcon),
];

export const phoneTabIds = {
  discover: ["discover-explore", "discover-distributors", "earn-home", "sell-overview"],
  earn: ["earn-home", "earn-opportunities", "earn-links", "earn-earnings"],
  sell: ["sell-overview", "sell-campaigns", "sell-sales", "sell-vault"],
  ops: ["ops-queue", "ops-moderation", "ops-audit", "ops-health"],
} as const;

export const navForArea = (area: "earn" | "sell" | "ops") =>
  area === "earn" ? earnNav : area === "sell" ? sellNav : opsNav;

export const allNavItems: readonly NavItem[] = [
  ...discoverNav,
  ...earnNav,
  ...sellNav,
  ...opsNav,
  ...accountNav,
];

const sectionPrefixes: Readonly<Record<string, readonly string[]>> = {
  [routes.explore]: ["/c", "/r", "/m"],
  [routes.distributors]: ["/u"],
};

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isActiveHref = (pathname: string, href: string) => {
  if (href === routes.earn.home || href === routes.sell.overview || href === routes.ops.queue)
    return pathname === href;
  if (startsWithSegment(pathname, href)) return true;
  return (sectionPrefixes[href] ?? []).some((prefix) => startsWithSegment(pathname, prefix));
};
