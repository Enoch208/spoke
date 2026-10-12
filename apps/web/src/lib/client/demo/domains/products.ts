import { sha256 } from "viem";
import { demoId, isDemoId } from "../../../../demo/world/ids";
import type { DemoProduct } from "../../../../demo/world/types";
import type { DemoWorld } from "../../../../demo/world/world";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import { page, tokenKeyOf } from "../views/basics";
import { productOf, productWire } from "../views/catalog";
import { requireMerchant } from "../views/merchant-org";

const categories = [
  { id: "templates", name: "Templates" },
  { id: "design", name: "Design" },
  { id: "dev tools", name: "Developer tools" },
  { id: "courses", name: "Courses" },
  { id: "research", name: "Research" },
  { id: "digital", name: "Digital goods" },
  { id: "education", name: "Education" },
  { id: "software", name: "Software" },
  { id: "other", name: "Other" },
];

const ownedProduct = (world: DemoWorld, merchantId: string, id: string): DemoProduct | undefined =>
  world.products.find((product) => product.id === id && product.merchantId === merchantId);

const save = (
  input: DemoInput<"products.save">,
  world: DemoWorld,
  merchantId: DemoProduct["merchantId"],
) => {
  const values = input.product;
  const token =
    tokenKeyOf(world, values.token) ??
    fail("TOKEN_NOT_ALLOWED", "Products are priced in SDUSD or the sample second token.");
  const price = BigInt(values.priceBaseUnits);
  const id = isDemoId(input.id) ? input.id : demoId("p", input.id);
  const existing = ownedProduct(world, merchantId, id);
  if (!existing && world.products.some((product) => product.id === id))
    return fail("NOT_AUTHORIZED", "That product belongs to another business.");
  const deliverableName = values.deliverable.split("/").at(-1) ?? values.deliverable;
  if (existing) {
    const changed = existing.price !== price || existing.deliverables[0]?.name !== deliverableName;
    Object.assign(existing, {
      title: values.title,
      summary: values.summary,
      outcome: values.outcome,
      description: values.description,
      category: values.category,
      price,
      token,
      fulfillmentMode: values.fulfillmentMode,
      refundPolicy: values.refundPolicy,
      version: changed ? existing.version + 1 : existing.version,
      deliverables: changed
        ? [
            {
              id: demoId("file", `${existing.id}-v${String(existing.version + 1)}`),
              name: deliverableName,
              kind: "zip" as const,
            },
          ]
        : existing.deliverables,
    });
    return existing;
  }
  const product: DemoProduct = {
    id,
    merchantId,
    title: values.title,
    summary: values.summary,
    outcome: values.outcome,
    description: values.description,
    category: values.category,
    price,
    token,
    fulfillmentMode: values.fulfillmentMode,
    version: 1,
    status: "ready",
    variants: [],
    billingPeriod: null,
    refundPolicy: values.refundPolicy,
    deliverables: [{ id: demoId("file", `${id}-v1`), name: deliverableName, kind: "zip" }],
  };
  world.products.push(product);
  return product;
};

export const productsReads = {
  "products.list": (input, runtime) => {
    const merchant = requireMerchant(runtime.world, runtime.personaId());
    const products = runtime.world.products
      .filter((product) => product.merchantId === merchant.id)
      .filter(
        (product) =>
          input.billing === undefined ||
          (input.billing === "subscription") === (product.billingPeriod !== null),
      )
      .map((product) => ({
        ...productWire(runtime.world, product),
        deliverable: product.deliverables[0]?.name ?? "Delivery instructions unavailable",
      }));
    return page(products, input);
  },
  "products.get": (input, runtime) => {
    const product = found(productOf(runtime.world, input.id), "Product");
    const owner =
      runtime.world.merchants.find((merchant) => merchant.id === product.merchantId)?.ownerId ===
      runtime.personaId();
    return {
      ...productWire(runtime.world, product),
      ...(owner
        ? { deliverable: product.deliverables[0]?.name ?? "Delivery instructions unavailable" }
        : {}),
    };
  },
  "products.categories": () => categories,
} satisfies PartialHandlers<"products">;

export const productsWrites = {
  "products.uploadAsset": async (input, runtime) => {
    const merchant = requireMerchant(runtime.world, runtime.personaId());
    const product = found(ownedProduct(runtime.world, merchant.id, input.id), "Product");
    const hash = sha256(new Uint8Array(await input.file.arrayBuffer())).slice(2);
    const asset = {
      id: demoId("asset", hash.slice(0, 16)),
      kind: input.file.type.startsWith("image/") ? ("image" as const) : ("download" as const),
      size: input.file.size,
      sha256: hash,
      url: `https://usespoke.xyz/demo/files/${hash.slice(0, 16)}`,
    };
    runtime.world.assets.push({ productId: product.id, asset });
    return asset;
  },
  "products.save": (input, runtime) => {
    const merchant = requireMerchant(runtime.world, runtime.personaId());
    return {
      ...productWire(runtime.world, save(input, runtime.world, merchant.id)),
      deliverable: input.product.deliverable,
    };
  },
} satisfies PartialHandlers<"products">;
