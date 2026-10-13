import { productInput, type ClientOutput } from "@spoke/protocol";
import { fill } from "@/lib/copy";
import { missingCopy, productsCopy } from "../copy/products";

export type Product = ClientOutput<"products.get">;

const between = (value: string, min: number, max: number) =>
  value.trim().length >= min && value.trim().length <= max;

export const missingFor = (product: Product): string[] => [
  ...(between(product.title, 3, 80) ? [] : [missingCopy.title]),
  ...(between(product.outcome, 10, 140) ? [] : [missingCopy.outcome]),
  ...(between(product.description, 50, 5000) ? [] : [missingCopy.description]),
  ...(BigInt(product.priceBaseUnits) > 0n ? [] : [missingCopy.price]),
  ...(product.deliverable ? [] : [missingCopy.delivery]),
];

export const isReady = (product: Product) => missingFor(product).length === 0;

export const missingLabel = (count: number) =>
  count === 1 ? productsCopy.missingOne : fill(productsCopy.missing, { n: String(count) });

const inputCategories = productInput.shape.category.options;

export const inputCategory = (value: string) =>
  inputCategories.find((category) => category === value) ?? "other";
