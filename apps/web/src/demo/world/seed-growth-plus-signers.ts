import { units } from "./catalog";
import { DAY, HOUR, MINUTE, iso, sampleAddress, sampleHash } from "./ids";
import { scopedId } from "./seed-growth-plus-scope";
import type { DemoCore, DemoSale } from "./types";
import type { DemoWorld, OrderSigner } from "./world";

export type SignedOrder = DemoWorld["attestations"][number];
export type Provider = "shopify" | "woocommerce";

interface SignerRow {
  n: number;
  label: string;
  provider: Provider;
  expiresInDays: number;
  revokedDaysAgo: number | null;
  perOrder: bigint;
  daily: bigint;
  usedToday: bigint;
}

const signerRows: readonly SignerRow[] = [
  {
    n: 1,
    label: "Shopify production",
    provider: "shopify",
    expiresInDays: 120,
    revokedDaysAgo: null,
    perOrder: units(100),
    daily: units(500),
    usedToday: units(302, 50),
  },
  {
    n: 2,
    label: "Old WooCommerce key",
    provider: "woocommerce",
    expiresInDays: 30,
    revokedDaysAgo: 7,
    perOrder: units(100),
    daily: units(400),
    usedToday: 0n,
  },
  {
    n: 3,
    label: "WooCommerce store key",
    provider: "woocommerce",
    expiresInDays: 5,
    revokedDaysAgo: null,
    perOrder: units(50),
    daily: units(300),
    usedToday: units(44),
  },
];

const SHOPIFY_SINCE = 60 * DAY;
const NEW_WOO_KEY_SINCE = 10 * DAY;

const rejections = [
  ["signer-revoked", 2, 6 * DAY, units(22)],
  ["duplicate", 3, 4 * DAY, units(22)],
  ["expired", 3, 3 * DAY, units(44)],
  ["over-limit", 3, 2 * DAY, units(66)],
  ["not-in-scope", 3, 2 * DAY - 3 * HOUR, units(22)],
  ["budget-used-up", 3, DAY, units(22)],
  ["bad-signature", 3, 20 * HOUR, units(22)],
  ["refund-unresolved", 3, 10 * HOUR, units(22)],
] as const;

export type RejectionReason = (typeof rejections)[number][0];

export const providerScope = (provider: string) => `provider:${provider}`;

export const signerLabelsFor = (merchantId: string): Record<string, string> =>
  Object.fromEntries(signerRows.map((row) => [scopedId(merchantId, "signer", row.n), row.label]));

export const rejectionReasonsFor = (merchantId: string): Record<string, RejectionReason> =>
  Object.fromEntries(
    rejections.map(([reason]) => [scopedId(merchantId, "attestation", reason), reason]),
  );

export const nonceOf = (id: string): string => BigInt(sampleHash(`nonce:${id}`)).toString();

export const seedSigners = (scope: string, anchor: number): OrderSigner[] =>
  signerRows.map((row) => ({
    id: scopedId(scope, "signer", row.n),
    address: sampleAddress(`signer:${scope}:${String(row.n)}`),
    scopes: [providerScope(row.provider), "campaigns:external"],
    limits: { perOrder: row.perOrder.toString(), daily: row.daily.toString() },
    expiry: iso(anchor + row.expiresInDays * DAY),
    revokedAt: row.revokedDaysAgo === null ? null : iso(anchor - row.revokedDaysAgo * DAY),
    usedToday: row.usedToday.toString(),
  }));

const order = (
  scope: string,
  key: string,
  fields: Omit<SignedOrder, "id" | "nonce" | "orderHash" | "signerId"> & { signer: number },
  orderHashLabel?: string,
): SignedOrder => {
  const id = scopedId(scope, "attestation", key);
  const { signer, ...rest } = fields;
  return {
    id,
    orderHash: sampleHash(`store-order:${orderHashLabel ?? id}`),
    nonce: nonceOf(id),
    signerId: scopedId(scope, "signer", signer),
    ...rest,
  };
};

export const seedAttestations = (core: DemoCore, scope: string) => {
  const anchor = core.anchor;
  const external = core.campaigns.find((campaign) => campaign.kind === "external");
  if (!external) throw new RangeError("The sample world needs an external-store campaign.");
  const sales = core.sales
    .filter((sale) => sale.campaignId === external.id)
    .sort((a, b) => a.purchasedAt - b.purchasedAt);
  const recent = sales.filter((sale) => sale.purchasedAt >= anchor - SHOPIFY_SINCE);
  const wooRecent = new Set(
    recent.filter((_, index) => (recent.length - 1 - index) % 3 === 0).map((sale) => sale.id),
  );
  const signerFor = (sale: DemoSale) => {
    if (sale.purchasedAt >= anchor - SHOPIFY_SINCE && !wooRecent.has(sale.id)) return 1;
    return sale.purchasedAt >= anchor - NEW_WOO_KEY_SINCE ? 3 : 2;
  };
  const accepted = sales.map((sale) =>
    order(
      scope,
      sale.id.replace(/^demo-/, ""),
      {
        campaignId: sale.campaignId,
        amount: sale.price.toString(),
        outcome: "accepted",
        saleId: sale.id,
        at: iso(sale.purchasedAt - 40_000),
        signer: signerFor(sale),
      },
      sale.id,
    ),
  );
  const wooSales = sales.filter((sale) => signerFor(sale) !== 1);
  const refundSale = wooSales.findLast((sale) => sale.status === "PENDING") ?? null;
  const amountSale = wooSales.findLast((sale) => sale.status === "FINALIZED") ?? null;
  const rejected = rejections.map(([reason, signer, ago, amount]) =>
    order(
      scope,
      reason,
      {
        campaignId: reason === "not-in-scope" ? "demo-c-1" : external.id,
        amount: amount.toString(),
        outcome: "rejected",
        saleId: null,
        at: iso(anchor - ago),
        signer,
      },
      reason === "duplicate" && refundSale ? refundSale.id : undefined,
    ),
  );
  const pending = order(scope, "pending-1", {
    campaignId: external.id,
    amount: units(22).toString(),
    outcome: "pending",
    saleId: null,
    at: iso(anchor - 25 * MINUTE),
    signer: 3,
  });
  const providerOf = new Map(
    signerRows.map((row) => [scopedId(scope, "signer", row.n), row.provider]),
  );
  return {
    attestations: [...accepted, ...rejected, pending],
    providerOf,
    refundSale,
    amountSale,
  };
};
