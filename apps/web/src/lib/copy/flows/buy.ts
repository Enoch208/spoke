export const buyFlow = {
  termsChanging: "These terms change at {effectiveAt}.",
  noReferral: "Nobody earns a commission on this purchase.",
  priceChanged:
    "The merchant updated this product after you opened it. Review the new details before you pay.",
  directLine: "Nobody earns a commission on this purchase.",
  allowanceSafe:
    "Only a small MON network fee was used. The {amount} allowance can’t be spent without a new purchase by you.",
  recentPurchase: "You bought this {relative}.",
  accessEnded: "Access ended because this purchase was refunded.",
} as const satisfies Record<string, string>;
