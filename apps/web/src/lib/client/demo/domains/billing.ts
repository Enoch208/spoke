import type { ClientOutput } from "@spoke/protocol";
import { iso } from "../../../../demo/world/ids";
import type { DemoMerchant, DemoSale, TokenKey } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import type { PartialHandlers } from "../handler";
import { page, sum, tokenInfo } from "../views/basics";
import { campaignsOfMerchant, merchantFor } from "./growth-scope";

type Invoice = ClientOutput<"billing.invoices">["items"][number];

const monthStart = (year: number, month: number) => Date.UTC(year, month, 1);

const salesOfMerchant = (world: DemoWorld, merchant: DemoMerchant): DemoSale[] => {
  const ids = new Set<string>(campaignsOfMerchant(world, merchant).map((campaign) => campaign.id));
  return world.sales.filter((sale) => ids.has(sale.campaignId));
};

const tokensOf = (world: DemoWorld, merchant: DemoMerchant): TokenKey[] =>
  [...new Set(campaignsOfMerchant(world, merchant).map((campaign) => campaign.token))].sort(
    (a, b) => a.localeCompare(b),
  );

const statements = (world: DemoWorld, merchant: DemoMerchant, now: number): Invoice[] => {
  const firstSale = Math.min(...salesOfMerchant(world, merchant).map((sale) => sale.purchasedAt));
  if (!Number.isFinite(firstSale)) return [];
  const first = new Date(firstSale);
  const current = new Date(now);
  const months =
    (current.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    current.getUTCMonth() -
    first.getUTCMonth();
  const symbol = world.tokens[tokensOf(world, merchant)[0] ?? "sdusd"].symbol;
  return Array.from({ length: Math.max(0, months) }, (_, index) => {
    const from = monthStart(current.getUTCFullYear(), current.getUTCMonth() - index - 1);
    const to = monthStart(current.getUTCFullYear(), current.getUTCMonth() - index);
    const month = iso(from).slice(0, 7);
    return {
      id: `${merchant.id}-statement-${month}`,
      period: { from: iso(from), to: iso(to) },
      amount: "0",
      currency: symbol,
      status: "paid",
      url: null,
    };
  });
};

export const billingReads = {
  "billing.summary": (_input, runtime) => {
    const world = runtime.world;
    const merchant = merchantFor(runtime);
    const settled = salesOfMerchant(world, merchant).filter((sale) => sale.status === "FINALIZED");
    const tokenOf = new Map(
      campaignsOfMerchant(world, merchant).map((campaign) => [campaign.id, campaign.token]),
    );
    return {
      feeBps: 0,
      period: { from: iso(merchant.joinedAt), to: iso(runtime.now()) },
      totals: tokensOf(world, merchant).map((key) => ({
        token: tokenInfo(world, key),
        settledValue: sum(
          settled.filter((sale) => tokenOf.get(sale.campaignId) === key).map((sale) => sale.price),
        ).toString(),
        protocolFees: "0",
      })),
    };
  },
  "billing.invoices": (input, runtime) =>
    page(statements(runtime.world, merchantFor(runtime), runtime.now()), input),
} satisfies PartialHandlers<"billing">;

export const billingWrites = {} satisfies PartialHandlers<"billing">;
