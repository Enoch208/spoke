export const required = {
  depositFirst:
    "Deposit reward funds before the campaign begins. Existing obligations cannot be withdrawn.",
  splitPreview: "This sale would allocate {split} across the {levelsWord} eligible contributors.",
  splitPreviewOne: "This sale would allocate 100% of the reward to the one eligible contributor.",
  shortPath:
    "Only {countWord} eligible people are in this path. The campaign’s short-path rule changes the split to {split}.",
  shortPathOne:
    "Only one eligible person is in this path. The campaign’s short-path rule changes the split to 100%.",
  shortPathReturned:
    "The remaining {returnedPercent} of the commission ({returnedAmount}) stays in the merchant’s reward budget.",
  pendingSale: "Purchase observed onchain. Rewards are reserved, not yet withdrawable.",
  merchantAttested:
    "This order is merchant-attested. The payment was not independently verified onchain.",
  finalized: "Commission is settled and ready to claim. View the proof.",
  refunded: "The order was refunded. Its pending commissions were cancelled.",
  selfReferral:
    "The buyer is also on the eligible referral path. This campaign does not allow self-referral.",
  budgetDepleted:
    "The campaign’s funded rewards are exhausted; this order is not eligible for advertised rewards.",
  reputation: "Only finalized and non-refunded sales count toward public performance.",
  syncing: "We are syncing recent transactions. This is not a confirmed payout yet.",
  demoToken: "Testnet demonstration token. No cash value and no guarantee of redemption.",
  notFunded: "This campaign cannot accept rewarded purchases yet.",
  wrongNetwork: "Switch to Monad Testnet to continue.",
  awaitingPurchase: "Waiting for your purchase transaction to confirm.",
  pendingHold: "Available after {unlockAt} unless the merchant refunds this sale.",
  paused: "New orders are paused. Existing balances and claims remain available.",
  claimed: "Transferred onchain · View transaction",
  unverified: "We couldn’t verify this transaction. Retry or view it in your wallet.",
} as const;

export const requiredIds = {
  "RM-01": "depositFirst",
  "RM-02": "splitPreview",
  "RM-03": "shortPath",
  "RM-04": "pendingSale",
  "RM-05": "merchantAttested",
  "RM-06": "finalized",
  "RM-07": "refunded",
  "RM-08": "selfReferral",
  "RM-09": "budgetDepleted",
  "RM-10": "reputation",
  "RM-11": "syncing",
  "RM-12": "demoToken",
  "RM-13": "notFunded",
  "RM-14": "wrongNetwork",
  "RM-15": "awaitingPurchase",
  "RM-17": "pendingHold",
  "RM-18": "paused",
  "RM-21": "claimed",
  "RM-22": "unverified",
} as const satisfies Record<string, keyof typeof required>;
