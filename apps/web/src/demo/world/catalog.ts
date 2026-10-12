import { demoToken } from "@spoke/protocol";
import { DAY, demoId, sampleAddress } from "./ids";
import type { DemoMerchant, DemoProduct, DemoToken, TokenKey } from "./types";

export const tokens: Record<TokenKey, DemoToken> = {
  sdusd: {
    key: "sdusd",
    address: sampleAddress("token:sdusd"),
    symbol: demoToken.symbol,
    name: demoToken.name,
    decimals: demoToken.decimals,
    label: "SDUSD (sample testnet demo token)",
  },
  sdeur: {
    key: "sdeur",
    address: sampleAddress("token:sdeur"),
    symbol: "SDEUR",
    name: "Sample second token",
    decimals: 6,
    label: "Sample second token · demo only, no value",
  },
};

export const units = (whole: number, cents = 0): bigint =>
  BigInt(whole) * 1_000_000n + BigInt(cents) * 10_000n;

const merchantRows = [
  [
    "northbeam",
    "Northbeam Templates",
    "Invoice, proposal and brand templates for independent studios.",
    "business",
    "Lisbon, PT",
  ],
  [
    "patchwork",
    "Patchwork Dev Tools",
    "Small, sharp command-line tools and cookbooks for TypeScript teams.",
    "domain",
    "Berlin, DE",
  ],
  [
    "field-research",
    "Field Research Co.",
    "Pricing and market reports for people building small software companies.",
    "unverified",
    "Nairobi, KE",
  ],
  [
    "halftone",
    "Halftone Courses",
    "Hands-on design courses with project files you keep.",
    "unverified",
    "Toronto, CA",
  ],
  [
    "stackwise",
    "Stackwise Academy",
    "A monthly library of production-ready app templates.",
    "unverified",
    "Lagos, NG",
  ],
  [
    "lumen-supply",
    "Lumen Supply",
    "Hand-bound notebooks sold through its own online store.",
    "unverified",
    "Copenhagen, DK",
  ],
] as const;

export const merchants = (anchor: number): DemoMerchant[] =>
  merchantRows.map(([slug, name, description, tier, region], index) => ({
    id: demoId("m", index + 1),
    slug: `demo-${slug}`,
    name,
    ownerId: demoId("owner", index + 1),
    address:
      index === 0
        ? sampleAddress("merchant-a:business")
        : sampleAddress(`merchant-${"abcdef"[index] ?? "x"}:main`),
    description,
    website: `https://example.com/${slug}`,
    verificationTier: tier,
    joinedAt: anchor - (200 - index * 10) * DAY,
    region,
    supportEmail: `support@${slug}.example.com`,
    budgetAlertSales: 5,
    closedAt: null,
    verification: null,
  }));

type ProductRow = readonly [
  merchant: number,
  title: string,
  summary: string,
  category: string,
  price: bigint,
  status: DemoProduct["status"],
];

const productRows: readonly ProductRow[] = [
  [
    1,
    "Invoice and proposal template pack",
    "Twelve editable invoice, quote and proposal layouts.",
    "templates",
    units(40),
    "ready",
  ],
  [
    1,
    "Brand starter kit",
    "Logo grid, type scale and social templates for a new studio.",
    "design",
    units(65),
    "ready",
  ],
  [
    1,
    "Client portal for Notion",
    "A client-facing project portal you duplicate in one click.",
    "templates",
    units(29),
    "ready",
  ],
  [1, "Line icon set", "640 line icons in three weights.", "design", units(24), "ready"],
  [
    1,
    "Proposal email swipe file",
    "Forty proposal and follow-up emails.",
    "templates",
    units(12),
    "draft",
  ],
  [
    1,
    "2025 studio planner",
    "Last year's planner, no longer sold.",
    "templates",
    units(18),
    "archived",
  ],
  [
    2,
    "Regex cookbook for TypeScript",
    "180 tested patterns with explanations.",
    "dev tools",
    units(25),
    "ready",
  ],
  [
    2,
    "Mockline API mocking CLI",
    "A one-seat licence for a local API mocking tool.",
    "dev tools",
    units(49),
    "ready",
  ],
  [
    3,
    "State of indie SaaS pricing",
    "A 60-page pricing report built from 400 public price pages.",
    "research",
    units(30),
    "ready",
  ],
  [
    4,
    "Auto layout in practice",
    "A six-hour course with twelve project files.",
    "courses",
    units(55),
    "ready",
  ],
  [
    5,
    "Pro templates monthly",
    "New production app templates every month.",
    "templates",
    units(9),
    "ready",
  ],
  [
    6,
    "Hand-bound field notebook",
    "A dot-grid notebook sold in the merchant's own store.",
    "design",
    units(22),
    "ready",
  ],
];

const deliverablesFor = (n: number, title: string): DemoProduct["deliverables"] => [
  { id: demoId("file", `${String(n)}-pdf`), name: `${title} (sample file).pdf`, kind: "pdf" },
  { id: demoId("file", `${String(n)}-zip`), name: `${title} (sample file).zip`, kind: "zip" },
  ...(n === 8
    ? [
        {
          id: demoId("file", `${String(n)}-key`),
          name: "Sample licence key",
          kind: "licence" as const,
        },
      ]
    : []),
];

export const products = (): DemoProduct[] =>
  productRows.map(([merchant, title, summary, category, price, status], index) => {
    const n = index + 1;
    return {
      id: demoId("p", n),
      merchantId: demoId("m", merchant),
      title,
      summary,
      outcome: summary,
      description: `${summary} Delivered as files you download after purchase. This is a sample product in Spoke's demo world.`,
      category,
      price,
      token: n === 9 ? "sdeur" : "sdusd",
      fulfillmentMode: n === 12 ? "external" : "download",
      version: n === 1 ? 2 : 1,
      status,
      variants:
        n === 4
          ? [
              { id: demoId("v", "4-solo"), name: "Solo licence", price: units(24) },
              { id: demoId("v", "4-team"), name: "Team licence", price: units(60) },
            ]
          : [],
      billingPeriod: n === 11 ? "monthly" : null,
      refundPolicy:
        "Refunds on request until the settlement hold ends. After that the sale is final.",
      deliverables: n === 12 ? [] : deliverablesFor(n, title),
    };
  });
