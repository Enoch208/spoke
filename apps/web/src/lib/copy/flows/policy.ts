export const policyFlow = {
  weightsSum: "Weights add up to {total}%. They must add up to exactly 100%.",
  levelsRange: "Choose between 1 and 5 paid levels.",
  rateRange: "Commission must be between 0.01% and 100%.",
  rateHigh: "More than half the price goes to commission.",
  noticeTooShort: "New terms must take effect at least 24 hours after you publish them.",
} as const satisfies Record<string, string>;
