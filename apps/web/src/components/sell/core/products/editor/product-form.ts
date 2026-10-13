import { parseTokenAmount, productInput, type ClientInput } from "@spoke/protocol";
import { formatUnits } from "viem";
import { editorCopy } from "../../copy/editor";
import type { Product } from "../product-status";

export type Fulfillment = "download" | "external" | "manual";
export type InputCategory = ClientInput<"products.save">["product"]["category"];

export type ProductForm = {
  title: string;
  outcome: string;
  summary: string;
  description: string;
  category: string;
  price: string;
  fulfillment: Fulfillment;
  file: string;
  link: string;
  instructions: string;
  refund: string;
  rights: boolean;
};

export type FormErrors = Partial<Record<keyof ProductForm, string>>;

const errors = editorCopy.errors;
const categories = productInput.shape.category.options;

export const isInputCategory = (value: string): value is InputCategory =>
  categories.some((category) => category === value);

export const blankForm: ProductForm = {
  title: "",
  outcome: "",
  summary: "",
  description: "",
  category: "",
  price: "",
  fulfillment: "manual",
  file: "",
  link: "",
  instructions: "",
  refund: "You can ask for a refund before the sale’s hold ends. After that, the sale is final.",
  rights: false,
};

export const formFrom = (product: Product): ProductForm => ({
  title: product.title,
  outcome: product.outcome,
  summary: product.summary,
  description: product.description,
  category: isInputCategory(product.category) ? product.category : "",
  price: formatUnits(BigInt(product.priceBaseUnits), product.token.decimals),
  fulfillment: product.fulfillmentMode,
  file: product.fulfillmentMode === "download" ? (product.deliverable ?? "") : "",
  link: product.fulfillmentMode === "external" ? (product.deliverable ?? "") : "",
  instructions: product.fulfillmentMode === "manual" ? (product.deliverable ?? "") : "",
  refund: product.refundPolicy,
  rights: true,
});

const length = (value: string, min: number, max: number) =>
  value.trim().length >= min && value.trim().length <= max;

const priceMin = 10_000n;
const priceMax = 100_000_000_000n;

export const parsePrice = (value: string, decimals: number): bigint | string => {
  const trimmed = value.trim();
  if (!trimmed) return errors.priceEmpty;
  if ((trimmed.split(".")[1] ?? "").length > decimals) return errors.priceDecimals;
  try {
    const amount = parseTokenAmount(trimmed, decimals);
    return amount < priceMin || amount > priceMax ? errors.priceRange : amount;
  } catch {
    return errors.priceRange;
  }
};

export const deliverableOf = (form: ProductForm) =>
  form.fulfillment === "download"
    ? form.file
    : form.fulfillment === "external"
      ? form.link.trim()
      : form.instructions.trim();

export const validate = (form: ProductForm, decimals: number): FormErrors => {
  const price = parsePrice(form.price, decimals);
  return {
    ...(length(form.title, 3, 80) ? {} : { title: errors.title }),
    ...(form.summary.length > 300 ? { summary: errors.summary } : {}),
    ...(isInputCategory(form.category) ? {} : { category: errors.category }),
    ...(typeof price === "string" ? { price } : {}),
    ...(form.fulfillment === "download" && !form.file ? { file: errors.file } : {}),
    ...(form.fulfillment === "external" && !/^https:\/\/\S+\.\S+/.test(form.link.trim())
      ? { link: errors.link }
      : {}),
    ...(form.fulfillment === "manual" && !length(form.instructions, 20, 2000)
      ? { instructions: errors.instructions }
      : {}),
    ...(length(form.refund, 10, 3000) ? {} : { refund: errors.refund }),
    ...(form.rights ? {} : { rights: errors.rights }),
  };
};

export const readinessHints = (form: ProductForm): FormErrors => ({
  ...(length(form.outcome, 10, 140) ? {} : { outcome: errors.outcome }),
  ...(length(form.description, 50, 5000) ? {} : { description: errors.description }),
});
