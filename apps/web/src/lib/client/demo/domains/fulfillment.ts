import { MINUTE, iso } from "../../../../demo/world/ids";
import { fail, found, type PartialHandlers } from "../handler";
import { ownsAddress } from "../views/basics";
import { campaignOf, productOf } from "../views/catalog";
import { saleOf } from "../views/receipt";

export const fulfillmentReads = {
  "fulfillment.access": (input, runtime) => {
    const world = runtime.world;
    const sale = found(saleOf(world, input.saleId), "Purchase");
    if (!ownsAddress(world, runtime.personaId(), sale.buyer))
      return fail("NOT_AUTHORIZED", "Only the buyer can open this purchase.");
    if (sale.status === "REFUNDED")
      return fail(
        "SALE_REFUNDED",
        "This purchase was refunded, so its files are no longer available.",
      );
    const campaign = found(campaignOf(world, sale.campaignId), "Campaign");
    const product = found(productOf(world, campaign.productId), "Product");
    const expiresAt = iso(runtime.now() + 15 * MINUTE);
    return {
      saleId: sale.id,
      items: product.deliverables.map((deliverable) => ({
        id: deliverable.id,
        url: `https://usespoke.xyz/demo/files/${deliverable.id}`,
        expiresAt,
      })),
    };
  },
} satisfies PartialHandlers<"fulfillment">;

export const fulfillmentWrites = {} satisfies PartialHandlers<"fulfillment">;
