import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { records } from "../db/schema.js";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";

export const purchasedProduct = async (
  services: Services,
  saleId: string,
  buyer: string,
  owner?: string,
) => {
  const [sale] = await services.chain.sale(saleId);
  if (
    sale.buyer.toLowerCase() !== buyer.toLowerCase() &&
    (!owner || (await services.store.identity("wallet", sale.buyer.toLowerCase())) !== owner)
  )
    throw new ApiProblem(403, "NOT_AUTHORIZED", "This purchase belongs to another wallet.");
  if (sale.status === 2)
    throw new ApiProblem(
      409,
      "SALE_REFUNDED",
      "This order was refunded. Product access has ended.",
    );
  if (sale.status !== 1 && sale.status !== 3)
    throw new ApiProblem(404, "NOT_FOUND", "No confirmed purchase exists.");
  const { campaign } = await services.chain.campaign(sale.campaignId.toString());
  const [product] = await services.store.db
    .select()
    .from(records)
    .where(
      and(
        eq(records.kind, "product-version"),
        sql`${records.payload}->>'skuHash' = ${campaign.skuHash}`,
      ),
    )
    .limit(1);
  if (!product)
    throw new ApiProblem(
      404,
      "NOT_FOUND",
      "The merchant has not attached delivery to this purchase.",
    );
  const merchant = await services.store.require(
    "merchant",
    z.string().parse(product.payload.merchantId),
  );
  if (
    merchant.owner !== product.owner ||
    String(merchant.payload.address).toLowerCase() !== campaign.merchant.toLowerCase()
  )
    throw new ApiProblem(403, "NOT_AUTHORIZED", "Product ownership does not match this campaign.");
  return { product, sale, deliverable: z.string().parse(product.payload.deliverable) };
};
