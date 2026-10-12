export const vaultCopy = {
  title: "Reward vault",
  description:
    "Where every unit of your reward money is, what you owe and what you can take back. Buyer payments sit in a separate ledger.",
  addBudget: "Add budget",
  chooseCampaign: "Add budget to which campaign?",
  noTopUp: "No campaign can take a top-up right now.",
  deposited: "Deposited",
  sumCheck:
    "Available + Reserved for pending sales + Owed to distributors + Claimed by distributors + Withdrawn by you = Deposited",
  addsUp: "Adds up",
  mismatch:
    "These numbers don’t add up yet. We’ve stopped showing them until our index matches the chain.",
  reportProblem: "Report a problem",
  obligations:
    "{amount} is reserved for pending sales or owed to distributors. You can’t withdraw it.",
  limit: "Lifetime reward limit",
  room: "Room under the limit",
  indexed: "Indexed to block {block}",
  wallet: "Your wallet",
  walletSdusd: "SDUSD",
  walletMon: "MON for network fees",
  getFunds: "Get test funds",
  campaigns: "By campaign",
  campaignsCaption: "Reward budget per campaign",
  totals: "Total",
  covered: "Full rewards covered",
  coveredValue: "{n} full rewards",
  coveredOne: "1 full reward",
  amountsIn: "Amounts in {symbol}",
  walletNote: "Deposits come from this wallet. Withdrawn budget and claimed proceeds return to it.",
  testnetToken: "Testnet demo token. No cash value.",
  withdraw: "Withdraw unused",
  proceedsTitle: "Sale proceeds",
  proceedsSubtitle: "Buyer payments, separate from rewards",
  proceedsSum: "= Buyer payments received · {amount}",
  claim: "Claim {amount}",
  claimIdle: "Nothing to claim",
  finalizeAndClaim: "Finalize {n} and claim",
  movements: "Movements",
  movementsCaption: "Every change to your reward budget and sale proceeds",
  allCampaigns: "All campaigns",
  allKinds: "All movements",
  emptyTitle: "No reward budget yet",
  emptyBody: "Launch a campaign to deposit rewards.",
  newCampaign: "New campaign",
  movementsEmpty: "No movements yet.",
  sale: "Sale #{id}",
  transaction: "Transaction",
} as const;

export const movementKindCopy = {
  deposited: { label: "Deposit", from: null, to: "Available" },
  reserved: {
    label: "Reserved for sale #{id}",
    from: "Available",
    to: "Reserved for pending sales",
  },
  settled: {
    label: "Settled at finalize #{id}",
    from: "Reserved for pending sales",
    to: "Owed to distributors",
  },
  released: {
    label: "Released by refund #{id}",
    from: "Reserved for pending sales",
    to: "Available",
  },
  claimedReward: {
    label: "Claimed by distributors",
    from: "Owed to distributors",
    to: "Claimed by distributors",
  },
  withdrawn: { label: "Withdrawn", from: "Available", to: "Withdrawn by you" },
  proceedsReleased: {
    label: "Released at finalize #{id}",
    from: "Held until the hold ends",
    to: "Ready to claim",
  },
  buyerRefunded: {
    label: "Refunded to buyer #{id}",
    from: "Held until the hold ends",
    to: "Refunded to buyers",
  },
  proceedsClaimed: { label: "Proceeds claimed", from: "Ready to claim", to: "Claimed" },
} as const;

export type MovementKindKey = keyof typeof movementKindCopy;
