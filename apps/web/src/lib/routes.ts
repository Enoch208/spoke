export const routes = {
  home: "/",
  explore: "/explore",
  launch: "/signup?intent=sell",
  start: "/signup",
  startSharing: "/signup?intent=earn",
  docs: "/developers",
  howItWorks: "/how-it-works",
  trust: "/trust",
  pricing: "/pricing",
  demo: "/demo",
  demoExit: "/demo/exit",
  status: "/status",
  support: "/support",
  distributors: "/distributors",
  labs: "/labs",
  maintenance: "/maintenance",
  legal: {
    terms: "/legal/terms",
    privacy: "/legal/privacy",
    disclosures: "/legal/disclosures",
    merchantAgreement: "/legal/merchant-agreement",
  },
  login: "/login",
  signup: "/signup",
  welcome: "/welcome",
  recover: "/recover",
  wallet: "/wallet",
  notifications: "/notifications",
  purchases: "/purchases",
  settings: {
    profile: "/settings/profile",
    security: "/settings/security",
    wallets: "/settings/wallets",
    notifications: "/settings/notifications",
    privacy: "/settings/privacy",
    preferences: "/settings/preferences",
    credentials: "/settings/credentials",
  },
  earn: {
    home: "/earn",
    opportunities: "/earn/opportunities",
    links: "/earn/links",
    network: "/earn/network",
    earnings: "/earn/earnings",
    payouts: "/earn/payouts",
    reputation: "/earn/reputation",
    invitations: "/earn/invitations",
    communities: "/earn/communities",
  },
  sell: {
    setup: "/sell/setup",
    overview: "/sell",
    products: "/sell/products",
    newProduct: "/sell/products/new",
    campaigns: "/sell/campaigns",
    newCampaign: "/sell/campaigns/new",
    studio: "/sell/studio",
    sales: "/sell/sales",
    vault: "/sell/vault",
    partners: "/sell/partners",
    discover: "/sell/partners/discover",
    analytics: "/sell/analytics",
    integrations: "/sell/integrations",
    signers: "/sell/integrations/signers",
    developers: "/sell/developers",
    team: "/sell/team",
    reports: "/sell/reports",
    disputes: "/sell/disputes",
    subscriptions: "/sell/subscriptions",
    partnerships: "/sell/partnerships",
    billing: "/sell/billing",
    settings: "/sell/settings",
    networks: "/sell/networks",
    currencies: "/sell/currencies",
  },
  developers: {
    home: "/developers",
    api: "/developers/api",
    sdk: "/developers/sdk",
    widgets: "/developers/widgets",
    contracts: "/developers/contracts",
    playground: "/developers/playground",
    webhooks: "/developers/webhooks",
    graph: "/developers/graph",
    clients: "/developers/clients",
    changelog: "/developers/changelog",
  },
  ops: {
    queue: "/ops",
    moderation: "/ops/moderation",
    audit: "/ops/audit",
    health: "/ops/health",
  },
} as const;

export const campaignTabs = [
  "overview",
  "network",
  "sales",
  "budget",
  "distributors",
  "policy",
  "settings",
] as const;
export type CampaignTab = (typeof campaignTabs)[number];

const segment = (value: string | number) => encodeURIComponent(String(value));

export const routeTo = {
  campaign: (campaignId: string) => `/c/${segment(campaignId)}`,
  campaignNetwork: (campaignId: string) => `/c/${segment(campaignId)}/network`,
  referral: (code: string) => `/r/${segment(code)}`,
  receipt: (chain: number | "demo", saleId: string) =>
    `/receipts/${segment(chain)}/${segment(saleId)}`,
  profile: (handle: string) => `/u/${segment(handle)}`,
  merchant: (slug: string) => `/m/${segment(slug)}`,
  checkout: (campaignId: string) => `/checkout/${segment(campaignId)}`,
  purchase: (saleId: string) => `/purchases/${segment(saleId)}`,
  purchaseAccess: (saleId: string) => `/purchases/${segment(saleId)}/access`,
  link: (nodeId: string) => `/earn/links/${segment(nodeId)}`,
  community: (communityId: string) => `/earn/communities/${segment(communityId)}`,
  product: (productId: string) => `/sell/products/${segment(productId)}`,
  sellCampaign: (campaignId: string, tab?: CampaignTab) =>
    tab && tab !== "overview"
      ? `/sell/campaigns/${segment(campaignId)}?tab=${tab}`
      : `/sell/campaigns/${segment(campaignId)}`,
  newTerms: (campaignId: string) =>
    `/sell/campaigns/new?mode=newVersion&campaign=${segment(campaignId)}`,
  sale: (saleId: string) => `/sell/sales/${segment(saleId)}`,
  partner: (address: string) => `/sell/partners/${segment(address)}`,
  integration: (provider: string) => `/sell/integrations/${segment(provider)}`,
  opsCase: (caseId: string) => `/ops/cases/${segment(caseId)}`,
} as const;

export const withNext = (path: string, next: string) => {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(next)}`;
};

export const isSafeNext = (next: string | null | undefined): next is string =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//");

export const sections = {
  product: "product",
  marketplace: "marketplace",
  network: "network",
  settlement: "settlement",
  reputation: "reputation",
  developers: "developers",
  howItWorks: "how-it-works",
  faq: "faq",
} as const;

export const anchor = (id: string) => `#${id}`;

export type AuthIntent = "earn" | "sell" | "buy";

export const isAuthIntent = (value: string | null | undefined): value is AuthIntent =>
  value === "earn" || value === "sell" || value === "buy";

export const authHref = (
  kind: "login" | "signup",
  options: { next?: string | undefined; intent?: AuthIntent | undefined } = {},
) => {
  const params = new URLSearchParams();
  if (options.next) params.set("next", options.next);
  if (options.intent) params.set("intent", options.intent);
  const query = params.toString();
  return `${kind === "login" ? routes.login : routes.signup}${query ? `?${query}` : ""}`;
};

export const intentHome: Record<AuthIntent, string> = {
  earn: routes.earn.home,
  sell: routes.sell.setup,
  buy: routes.explore,
};

export const afterAuthPath = ({
  isNewAccount,
  next,
  intent,
}: {
  isNewAccount: boolean;
  next: string | null;
  intent: AuthIntent | null;
}) => {
  if (isNewAccount) {
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (intent) params.set("intent", intent);
    const query = params.toString();
    return `${routes.welcome}${query ? `?${query}` : ""}`;
  }
  return next ?? (intent ? intentHome[intent] : routes.earn.home);
};
