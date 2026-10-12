export const routes = {
  home: "/",
  explore: "/campaigns",
  launch: "/campaigns/new",
  docs: "/developers",
} as const;

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
