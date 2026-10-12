import { mutationHook, queryHook } from "../use-client";

export const useCheckoutPreview = queryHook("checkout.preview");
export const useCheckoutCreateIntentMutation = mutationHook("checkout.createIntent", ["checkout"]);
export const useCheckoutGetIntent = queryHook("checkout.getIntent");
export const useCheckoutAttachTransactionMutation = mutationHook("checkout.attachTransaction", [
  "checkout",
]);
