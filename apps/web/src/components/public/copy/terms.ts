export const termsCopy = {
  heading: "Campaign terms",
  rows: {
    product: "Product",
    whoCanBuy: "Who can buy",
    regions: "Regions",
    commission: "Commission basis",
    perSaleCap: "Per-sale cap",
    campaignCap: "Campaign reward cap",
    whoGetsPaid: "Who gets paid",
    shortPaths: "Short paths",
    hold: "Settlement hold",
    refunds: "Refunds and cancellations",
    chargebacks: "Chargebacks",
    token: "Payout token and network",
    claims: "Claims and network fees",
    exclusions: "Attribution exclusions",
    sharing: "Sharing rules and disclosure",
    privacy: "Privacy",
    disputes: "Disputes",
    changes: "Changes to terms",
    expiry: "Expiry",
  },
  product: "{title}, sold by {merchant}. Delivered as {delivery}.",
  whoCanBuy:
    "Anyone with a Spoke account on Monad Testnet. Buyers never have to share or join anything. One purchase per buyer.",
  noRegions: "No regional restrictions set.",
  regions: "Only buyers in {regions}.",
  commission:
    "{rate} of the sale price ({bps} basis points), paid from the merchant’s funded reward budget.",
  perSaleCap: "At most {cap} per sale.",
  campaignCap: "This campaign can commit at most {cap} in rewards in total.",
  whoGetsPaid:
    "Up to {people}, nearest to the buyer first: the person whose link was used, then the person above them, and so on. Weights {weights}. The buyer and the merchant are never paid, and no wallet is paid twice for one sale.",
  renormalize:
    "If fewer than {count} eligible people are in the path, their weights scale up so the whole reward is paid.",
  returnUnused:
    "If fewer than {count} eligible people are in the path, missing shares stay in the merchant’s reward budget.",
  hold: "Rewards are reserved at purchase and settle {hold} later. They can’t be claimed before then.",
  refunds:
    "{policy} The merchant can refund until the hold ends. A refund returns the buyer’s full payment and cancels the sale’s pending rewards.",
  chargebacks:
    "Payment is an onchain token transfer held in escrow until the hold ends; there are no card chargebacks.",
  token:
    "{symbol} on Monad Testnet (chain 10143). Testnet demonstration token. No cash value and no guarantee of redemption.",
  claims:
    "Each person claims their own settled rewards and pays the network fee for that claim. Anyone can finalize a sale once its hold ends.",
  exclusions:
    "Purchases through a link where the buyer is on the paid path are blocked. A sale’s path is fixed when it’s made and never changes.",
  merchantRules: "{merchant}’s own rules:",
  privacy:
    "Spoke never publishes buyer details. Sale amounts, paid wallets and transactions are public onchain.",
  disputes:
    "Contact {merchant} first. If that doesn’t resolve it, report it to Spoke. We can review listings but can’t reverse onchain payments.",
  changes:
    "Terms for a sale never change after it happens. {merchant} can publish new terms for future sales with at least 24 hours’ notice.",
  scheduled: "New terms from {date}",
  keepToday: "Sales before then keep today’s terms.",
  now: "Now",
  from: "From {date}",
  compare: {
    commissionBps: "Commission rate",
    perSaleCap: "Per-sale cap",
    campaignLiabilityCap: "Campaign reward cap",
    maxRewardedAncestors: "Paid levels",
    weightsBps: "Weights",
    shortPathMode: "Short-path rule",
    holdSeconds: "Settlement hold",
  },
  shortPathModes: {
    RENORMALIZE_EXISTING: "Scale up to pay the whole reward",
    RETURN_UNUSED: "Return unused shares to the budget",
  },
  expiry: "Open until {date}.",
  agreement: "Merchant agreement",
} as const;
