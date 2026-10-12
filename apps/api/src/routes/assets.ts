import { asset, clientMethodSchemas, resourceId } from "@spoke/protocol";
import { accountId, merchantFor, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { assetView, loadAsset, storeAsset } from "../services/assets.js";
import type { ApiContext, Services } from "../types.js";

const uploaded = async (c: ApiContext) => {
  if (!c.req.header("content-type")?.startsWith("multipart/form-data"))
    throw new ApiProblem(415, "VALIDATION_FAILED", "Upload a multipart file.");
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || form.getAll("file").length !== 1)
    throw new ApiProblem(400, "VALIDATION_FAILED", "Upload one file.");
  return file;
};
export const assetRoutes = (services: Services) => {
  const app = router();
  route(app, services, "POST", "/merchant/products/:id/assets", "merchant", async (c) => {
    const id = resourceId.parse(c.req.param("id"));
    const file = await uploaded(c);
    clientMethodSchemas["products.uploadAsset"].input.parse({ id, file });
    const merchant = await merchantFor(c, services);
    const product = await services.store.get("product", id);
    if (product && product.payload.merchantId !== merchant.id)
      throw new ApiProblem(404, "NOT_FOUND", "No such product.");
    await services.store.rate(`uploads:${accountId(c)}`, 20, 3600);
    return ok(c, assetView(await storeAsset(services, accountId(c), file, id)), 201);
  });
  route(app, services, "POST", "/merchant/logo", "session", async (c) => {
    const file = await uploaded(c);
    await services.store.rate(`logos:${accountId(c)}`, 10, 3600);
    const row = await storeAsset(services, accountId(c), file, null, true);
    const view = asset.parse(assetView(row));
    return ok(
      c,
      { url: view.url, width: view.width, height: view.height, sha256: view.sha256 },
      201,
    );
  });
  route(app, services, "GET", "/assets/:id", "public", async (c) => {
    const { row, bytes } = await loadAsset(services, c.req.param("id") ?? "");
    if (row.payload.kind !== "image") throw new ApiProblem(404, "NOT_FOUND", "No such image.");
    c.header("content-type", "image/webp");
    c.header("cache-control", "public, max-age=31536000, immutable");
    c.header("etag", `"${String(row.payload.sha256)}"`);
    return c.body(new Uint8Array(bytes));
  });
  return app;
};
