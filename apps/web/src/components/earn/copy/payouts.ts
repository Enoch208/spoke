export const payoutsCopy = {
  title: "Payouts",
  description:
    "Claims send your finalized rewards to your account. Rewards can’t be redirected to another address.",
  claim: {
    title: "Claim",
    readAt: "Read from the chain at block {block}",
    readDemo: "Read from the demo world, not the chain",
    action: "Claim {amount}",
    inProgress: "Claim in progress",
    noteOne:
      "One claim sends everything claimable in this token in a single transaction. You pay a small testnet network fee.",
    noteTwo: "Claiming again is safe: a claim can’t pay twice.",
    empty:
      "Nothing to claim yet. Rewards become claimable once a sale’s hold ends and it’s finalized.",
    toFinalize: "See sales ready to finalize",
    demoToken: "Demo",
  },
  finalize: {
    title: "Ready to finalize",
    intro:
      "These sales finished their hold and can’t be refunded any more. Anyone can finalize a sale; it makes every share on it claimable, yours included. You don’t have to wait for the merchant.",
    all: "Finalize all ({n})",
    someOf: "Finalize 10 of {n}",
    action: "Finalize",
    running: "Finalizing…",
    empty: "No sales are waiting to be finalized.",
    columns: {
      sale: "Sale",
      product: "Product · merchant",
      ended: "Hold ended",
      share: "Your share",
      shares: "Shares on this sale",
    },
    pausedTip: "Paused campaigns still settle, and you can still claim.",
  },
  holds: {
    title: "Holds ending soon",
    intro: "The merchant can still refund these until the hold ends.",
    endsIn: "Hold ends {time}",
    empty: "No sales are in their hold right now.",
    columns: { sale: "Sale", product: "Product", ends: "Hold ends", share: "Your share" },
  },
  history: {
    title: "Claim history",
    empty: "You haven’t claimed anything yet.",
    syncing: "Confirmed onchain. Updating your history…",
    claimed: "Claimed",
    columns: {
      date: "Date",
      amount: "Amount",
      token: "Token",
      status: "Status",
      tx: "Transaction",
      block: "Block",
    },
    pages: "Claim history pages",
  },
} as const;
