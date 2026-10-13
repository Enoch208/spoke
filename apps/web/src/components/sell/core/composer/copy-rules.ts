export const rulesCopy = {
  dates: "Dates",
  goesLive: "Goes live when you launch",
  ends: "Ends",
  endPreset: "{days} days after launch",
  endCustom: "Pick a date",
  endCustomLabel: "End date and time",
  endCustomHelper: "In your time zone. {utc}",
  endHelper:
    "After it ends, no new sales or links. Pending sales still settle and everyone can still claim.",
  hold: "Settlement hold",
  refunds: "Refund window shown to buyers",
  refundTerms:
    "You can ask for a refund until {hold} after purchase. After that, the sale is final.",
  regions: "Buyer regions",
  regionsValue: "Buyers anywhere",
  regionsNote:
    "Region limits aren’t available yet, so every campaign accepts buyers anywhere. The chain can’t verify where someone is.",
  eligibility: "Buyer eligibility",
  enforced: "Enforced by the contract",
  onePurchase: "One purchase per wallet in this campaign",
  noSelfPay: "The buyer can never be paid on their own purchase",
  excluded: "Never paid",
  excludeBuyer: "The buyer",
  excludeMerchant: "Your merchant wallet",
  preview: "Designed preview",
  discount: "Buyer discount with a separate budget",
  moreExclusions: "Exclude more wallets",
  access: "Who can start links",
  anyone: "Anyone",
  anyoneHelper: "Anyone can create a link and share it.",
  inviteOnly: "Invitation only",
  inviteHelper:
    "Invited people can start links. Anyone can join under an invited person’s link. You invite distributors after launch.",
  inviteDemoOnly: "Invitation-only campaigns run in demo mode for now.",
  tryDemo: "Try it in demo mode",
  disclosure: "Sponsorship disclosure",
  disclosureHelper: "Every share kit shows this disclosure next to the link.",
} as const;

export const reviewCopy = {
  title: "Review the terms",
  description:
    "These sentences are generated from your draft. Buyers and distributors see the same terms.",
  fix: "Fix {count} things before launch:",
  fixOne: "Fix 1 thing before launch:",
  edit: "Edit",
  fingerprints: "Fingerprints",
  policyHash: "Policy hash",
  policyHashHelper: "The fingerprint of these terms. Every sale records it.",
  productHash: "Product fingerprint",
  preparing: "Preparing the fingerprint…",
  prepareFailed: "We couldn’t prepare these terms. {reason}",
  notSaved: "Your latest changes aren’t saved yet.",
  retry: "Try again",
  immutable:
    "Terms for a sale never change after it happens. You can publish new terms for future sales with at least 24 hours’ notice.",
  backup: "Back up your recovery phrase before you deposit.",
  backupNow: "Back up now",
  confirm:
    "I’ve checked these terms. I understand they’re public and binding for every sale made under them.",
  confirmError: "Confirm the terms to launch.",
  copied: "Policy hash copied",
  copiedProduct: "Product fingerprint copied",
  terms: {
    price: "Buyers pay {price} ({tokenLabel}) for {product} (version {version}).",
    reward:
      "Each sale reserves {rate} of the price as a reward, up to {cap}: {reward} at this price.",
    levels:
      "Up to {count} people on the buyer’s link path are paid, nearest first: {weights} of the reward.",
    levelsOne: "The person whose link the buyer used is paid the whole reward.",
    renormalize:
      "If fewer than {count} people are on the path, the whole reward is shared among them in the same proportions.",
    returnUnused:
      "If fewer than {count} people are on the path, they get their levels’ shares and the rest returns to your budget.",
    realSales: "Nobody is paid for joining or inviting. Rewards exist only for real sales.",
    hold: "You can refund a sale until its {hold} hold ends. Then it finalizes and rewards can be claimed.",
    deposit: "You deposit {deposit} now. Rewards can never exceed {limit} in total.",
    excluded: "The buyer and your own wallet are never paid. One purchase per wallet.",
    anyone: "Anyone can start a link.",
    inviteOnly: "Only invited distributors can start links; anyone can join under them.",
    regions: "Buyers anywhere.",
    ends: "Ends {date}. After that, no new sales or links; pending sales still settle.",
    disclosure: "Distributors must show: “{disclosure}”",
    claims: "Distributors claim their own rewards and pay their own network fees.",
    chain:
      "Rewards and sales use {symbol} on Monad Testnet (chain {chainId}). Spoke charges no fee on testnet.",
    contact:
      "Buyers contact you at {contact}. Buyer wallets are public onchain; Spoke never publishes buyer contact details.",
  },
} as const;
