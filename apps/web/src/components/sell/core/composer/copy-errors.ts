export const stepErrors = {
  product: {
    missing: "Choose a product to sell in this campaign.",
    notReady: "This product isn’t ready. Finish it in the product editor.",
  },
  budget: {
    depositEmpty: "Enter how much to deposit for rewards.",
    depositInvalid: "Enter an amount like 100 or 52.50.",
    depositLow: "Deposit at least {reward} so one full reward can be reserved.",
    depositBalance: "You have {balance}. Deposit less or get test {symbol}.",
    decimals: "{symbol} allows at most {decimals} decimal places.",
    limitEmpty: "Set the most this campaign may ever pay in rewards.",
    limitInvalid: "Enter an amount like 200 or 105.",
    limitLow: "The lifetime limit must be at least one full reward ({reward}).",
    limitBelowCap: "The lifetime limit must be at least the per-sale cap ({cap}).",
    depositOverLimit: "The deposit can’t be more than the lifetime limit ({limit}).",
    capOverLimit: "The per-sale cap can’t be more than the campaign’s lifetime limit ({limit}).",
    alertRange: "Choose between 1 and 50 rewards for the alert.",
    needsRewards: "Finish the Rewards step first so the reward per sale is known.",
  },
  rules: {
    endSoon: "Set an end date at least 1 hour from now.",
    endFar: "Campaigns can run for up to 365 days. You can launch a new one later.",
    endInvalid: "Choose a date and time.",
  },
} as const;
