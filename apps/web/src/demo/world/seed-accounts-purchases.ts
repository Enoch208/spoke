import type { Address } from "viem";
import { HOUR } from "./ids";
import { productTitle, sdusdOnly, tokenText, type NoticeSpec } from "./seed-accounts-copy";
import type { DemoCampaign, DemoCore, DemoSale } from "./types";

interface Bought {
  sale: DemoSale;
  campaign: DemoCampaign;
  product: string;
  price: string;
  merchant: string;
}

const purchase = (
  bought: Bought,
  kind: NoticeSpec["kind"],
  title: string,
  body: string,
  at: number,
): NoticeSpec => ({
  kind,
  category: "purchases",
  workspace: "earn",
  title,
  body,
  href: `/purchases/${bought.sale.id}`,
  at,
  ...sdusdOnly(bought.campaign.token, bought.sale.price),
});

const boughtBy = (core: DemoCore, address: Address): Bought[] =>
  core.sales
    .filter((sale) => sale.buyer === address)
    .flatMap((sale) => {
      const campaign = core.campaigns.find((candidate) => candidate.id === sale.campaignId);
      if (!campaign) return [];
      const merchant = core.merchants.find((candidate) => candidate.id === campaign.merchantId);
      return [
        {
          sale,
          campaign,
          product: productTitle(core, campaign),
          price: tokenText(core, sale.price, campaign.token),
          merchant: merchant?.name ?? "The merchant",
        },
      ];
    });

const lifecycle = (bought: Bought): NoticeSpec[] => {
  const { sale, product, price, merchant } = bought;
  const confirmed = purchase(
    bought,
    "purchase.confirmed",
    "Purchase confirmed",
    `${product} for ${price}. Your access is ready.`,
    sale.purchasedAt,
  );
  const final =
    sale.finalizedAt === null
      ? []
      : [
          purchase(
            bought,
            "purchase.final",
            "Purchase settled",
            `The refund window for ${product} has closed.`,
            sale.finalizedAt,
          ),
        ];
  const refunded =
    sale.refundedAt === null
      ? []
      : [
          purchase(
            bought,
            "purchase.refunded",
            "Refund issued",
            `${merchant} refunded ${price} to your account for ${product}.`,
            sale.refundedAt + HOUR / 6,
          ),
        ];
  return [confirmed, ...final, ...refunded];
};

export const purchaseNotices = (core: DemoCore, address: Address): NoticeSpec[] => {
  const bought = boughtBy(core, address);
  const settled = bought
    .filter((row) => row.sale.finalizedAt !== null)
    .sort((a, b) => b.sale.purchasedAt - a.sale.purchasedAt)
    .slice(0, 1)
    .map((row) =>
      purchase(
        row,
        "refund.declined",
        "Refund request declined",
        `${row.merchant} declined your refund request: The files were downloaded in full, so this order can't be refunded.`,
        row.sale.purchasedAt + Math.floor((row.sale.unlockAt - row.sale.purchasedAt) / 2),
      ),
    );
  return [...bought.flatMap(lifecycle), ...settled];
};
