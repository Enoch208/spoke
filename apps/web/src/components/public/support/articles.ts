import { routes } from "@/lib/routes";

export type Article = {
  slug: string;
  title: string;
  body: string;
  link?: { label: string; href: string };
};

export type Topic = { id: string; title: string; articles: readonly Article[] };

export const topics: readonly Topic[] = [
  {
    id: "getting-started",
    title: "Getting started",
    articles: [
      {
        slug: "what-is-spoke",
        title: "What is Spoke?",
        body: "Merchants fund a reward for real sales. People share products through links that branch from person to person. When a sale settles, everyone on its path gets the share the campaign promised.",
        link: { label: "How Spoke works", href: routes.howItWorks },
      },
      {
        slug: "what-is-sdusd",
        title: "What is SDUSD?",
        body: "A testnet demonstration token. No cash value and no guarantee of redemption. Get some free from Wallet, Get test funds.",
        link: { label: "Open Wallet", href: routes.wallet },
      },
      {
        slug: "what-is-demo",
        title: "What is demo mode?",
        body: "A sample world that runs in your browser with no real tokens. Every screen in it is marked Demo data.",
        link: { label: "Try the demo", href: routes.demo },
      },
    ],
  },
  {
    id: "buying",
    title: "Buying",
    articles: [
      {
        slug: "same-price",
        title: "Do I pay more through someone’s link?",
        body: "No. You pay the listed price. Rewards come from the merchant’s funded budget.",
      },
      {
        slug: "refunds",
        title: "How do refunds work?",
        body: "The merchant can refund until the sale’s hold ends. Ask from your purchase page. A refund returns your full payment and cancels the pending rewards.",
        link: { label: "Your purchases", href: routes.purchases },
      },
      {
        slug: "self-referral",
        title: "Why was my purchase blocked as self-referral?",
        body: "You were on the referral path of the link you used. The buyer is also on the eligible referral path. This campaign does not allow self-referral. Buy through a different link or without one.",
      },
    ],
  },
  {
    id: "earning",
    title: "Sharing and earning",
    articles: [
      {
        slug: "how-to-earn",
        title: "How do I earn?",
        body: "Create your link for a campaign and share it. When someone buys through it, or through someone you passed it to, and the sale settles, you can claim your share.",
        link: { label: "Explore campaigns", href: routes.explore },
      },
      {
        slug: "pending",
        title: "Why is my reward pending?",
        body: "Rewards are reserved at purchase and settle after the campaign’s hold. Until then the merchant can still refund.",
      },
      {
        slug: "why-not-paid",
        title: "Why didn’t I earn from this sale?",
        body: "Usually one of these: you were further up the branch than the campaign’s paid levels; the campaign’s rules excluded you; or the sale was refunded. A purchase through your link can also be blocked before it happens, when the buyer is on your path or the campaign’s rewards are used up. If the buyer then buys directly, nobody earns a commission on that purchase.",
      },
      {
        slug: "recruiting",
        title: "Do I earn for inviting people?",
        body: "No. You earn only when a sale through your branch settles.",
      },
      {
        slug: "split-changes",
        title: "Can the merchant change the split after I share?",
        body: "Not for sales already made. Terms for a sale never change after it happens. A merchant can publish new terms for future sales with at least 24 hours’ notice; if you have a link, Spoke notifies you, and the campaign page shows the date they take effect.",
      },
    ],
  },
  {
    id: "payouts",
    title: "Payouts",
    articles: [
      {
        slug: "claim",
        title: "How do I claim?",
        body: "Open Earn, then Payouts, and press Claim. It claims everything you can claim in that token.",
        link: { label: "Open Payouts", href: routes.earn.payouts },
      },
      {
        slug: "fees",
        title: "Who pays the network fee?",
        body: "Whoever sends the transaction. New accounts get a little testnet MON to cover their first ones.",
      },
    ],
  },
  {
    id: "reputation",
    title: "Reputation",
    articles: [
      {
        slug: "what-counts",
        title: "What counts toward my profile?",
        body: "Only finalized and non-refunded sales count toward public performance.",
      },
      {
        slug: "hide-profile",
        title: "Can I hide my profile?",
        body: "Yes. Choose Public, Pseudonymous or Private in Settings, Privacy. Private is the default.",
        link: { label: "Privacy settings", href: routes.settings.privacy },
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    articles: [
      {
        slug: "lost-passkey",
        title: "I lost my passkey",
        body: "Recover with your recovery phrase on the Recover page. Without the phrase we can’t recover the account for you.",
        link: { label: "Recover your account", href: routes.recover },
      },
      {
        slug: "in-app-browser",
        title: "Passkeys don’t work in my app’s browser",
        body: "Some apps open links in a built-in browser that can’t use passkeys. Open the link in Safari or Chrome; your referral link stays the same.",
      },
    ],
  },
  {
    id: "selling",
    title: "Selling",
    articles: [
      {
        slug: "campaign-cost",
        title: "What does a campaign cost?",
        body: "The reward budget you choose to fund, plus network fees. No protocol fee during the testnet.",
      },
      {
        slug: "withdraw-budget",
        title: "Can I get unused budget back?",
        body: "Yes, any part that isn’t reserved for pending sales or already earned.",
      },
    ],
  },
  {
    id: "developers",
    title: "Developers and proof",
    articles: [
      {
        slug: "api",
        title: "Where is the API?",
        body: "Start at the developer portal.",
        link: { label: "Developer portal", href: routes.developers.home },
      },
      {
        slug: "sale-missing",
        title: "My sale doesn’t show",
        body: "Open its receipt and press Verify onchain to read the contract directly. If the indexer is behind, the System status page says so.",
        link: { label: "System status", href: routes.status },
      },
    ],
  },
];

export const matchArticles = (query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return topics.flatMap((topic) =>
    topic.articles.filter((article) =>
      `${article.title} ${article.body}`.toLowerCase().includes(needle),
    ),
  );
};
