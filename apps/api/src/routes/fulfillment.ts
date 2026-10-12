import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { uintString } from "@spoke/protocol";
import { digest, newId } from "../db/store.js";
import { accountId, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { loadAsset } from "../services/assets.js";
import { purchasedProduct } from "../services/fulfillment.js";
import type { Services } from "../types.js";

export const fulfillmentRoutes = (services: Services) => {
  const app = router();
  route(app, services, "POST", "/fulfillment/:saleId/access", "session", async (c) => {
    const saleId = uintString.parse(c.req.param("saleId"));
    await services.store.rate(`access:${accountId(c)}`, 30, 60);
    const { product, sale } = await purchasedProduct(
      services,
      saleId,
      c.get("session").address,
      accountId(c),
    );
    const id = newId();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 900_000).toISOString();
    await services.store.put("access-grant", id, accountId(c), {
      tokenHash: digest(token),
      saleId,
      buyer: sale.buyer,
      productVersionId: product.id,
      expiresAt,
    });
    return ok(c, {
      saleId,
      items: [
        {
          id,
          url: new URL(
            `/v1/downloads/${id}?token=${token}`,
            services.apiOrigin ?? services.webOrigin,
          ).href,
          expiresAt,
        },
      ],
    });
  });
  route(app, services, "GET", "/downloads/:id", "public", async (c) => {
    const id = z.uuid().parse(c.req.param("id"));
    const token = z
      .string()
      .regex(/^[\da-f]{64}$/)
      .parse(c.req.query("token"));
    const grant = await services.store.require("access-grant", id);
    const expected = Buffer.from(z.string().length(64).parse(grant.payload.tokenHash), "hex");
    if (
      !timingSafeEqual(Buffer.from(digest(token), "hex"), expected) ||
      Date.parse(z.string().parse(grant.payload.expiresAt)) <= Date.now()
    )
      throw new ApiProblem(403, "NOT_AUTHORIZED", "This download link has expired or is invalid.");
    const { product, deliverable } = await purchasedProduct(
      services,
      z.string().parse(grant.payload.saleId),
      z.string().parse(grant.payload.buyer),
    );
    if (product.id !== grant.payload.productVersionId)
      throw new ApiProblem(
        409,
        "PRODUCT_VERSION_MISMATCH",
        "Product version does not match this grant.",
      );
    c.header("cache-control", "private, no-store");
    c.header("referrer-policy", "no-referrer");
    if (product.payload.fulfillmentMode === "external") {
      const target = z
        .url()
        .refine((value) => new URL(value).protocol === "https:")
        .parse(deliverable);
      return c.redirect(target, 302);
    }
    if (product.payload.fulfillmentMode === "manual") {
      c.header("content-disposition", "attachment; filename=spoke-delivery.txt");
      return c.text(deliverable);
    }
    const { row, bytes } = await loadAsset(services, deliverable);
    if (row.owner !== product.owner)
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Deliverable belongs to another merchant.");
    c.header("content-type", "application/octet-stream");
    c.header("content-disposition", "attachment; filename=spoke-product");
    return c.body(new Uint8Array(bytes));
  });
  return app;
};
