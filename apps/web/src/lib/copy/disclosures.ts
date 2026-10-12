import { required } from "./required";

export type DisclosureCopy = {
  readonly topic: string;
  readonly short?: string;
  readonly merchantShort?: string;
  readonly long?: string;
};

export const disclosures = {
  "D-01": {
    topic: "Testnet token",
    short: "SDUSD · testnet demo token, no cash value",
    long: `${required.demoToken} SDUSD (SpokeDemoUSD) exists only on Monad Testnet so you can try Spoke. It is not USD, can’t be exchanged for money, and anyone can mint it from the faucet. Network fees are paid in testnet MON, which also has no cash value.`,
  },
  "D-02": {
    topic: "Sponsored recommendation (for distributors)",
    short: "Affiliate link: I may earn a commission if you buy.",
    long: "If you could earn from a link you share, say so where you share it. Many places require a clear disclosure such as “Affiliate link” or “I earn a commission on sales”. Recommend only what you’d recommend anyway, and never post fake reviews or testimonials.",
  },
  "D-03": {
    topic: "Referral disclosure (for buyers)",
    short: "Shared by {handle}, who may earn part of this sale’s commission.",
    long: "This link is part of {merchantName}’s campaign. If you buy, up to {maxLevels} people on the link’s path share a commission of {rate} of the price. The commission is paid from the merchant’s funded reward budget; it isn’t added to your price. You never need to share or join anything to buy.",
  },
  "D-04": {
    topic: "Attribution is not causation",
    short: "The path shows who shared the link, not who persuaded the buyer.",
    long: "Spoke records the chain of links that led to a purchase under the campaign’s published rule. Being included in a referral path does not prove a particular person’s influence on the buyer, and Spoke never claims it does.",
  },
  "D-05": {
    topic: "Merchant-attested orders",
    short: required.merchantAttested,
    long: "{merchantName}’s authorised signer stated that this order happened in their store. Spoke checked the signature, that it hadn’t expired and that the order wasn’t used before. Spoke didn’t see the payment itself, so this is the merchant’s statement, not independent proof that the payment settled.",
  },
  "D-06": {
    topic: "Reputation methodology",
    short: required.reputation,
    long: "A public record counts only sales that were finalized and not refunded, across every merchant on Spoke. It shows settled sales, their value, commission settled, the number of merchants and campaigns, categories and last activity, as of a specific block. It is a set of facts, not a score or a ranking. An address isn’t a person: Spoke doesn’t claim that one wallet is one human. Methodology v{version}.",
  },
  "D-07": {
    topic: "Demo mode",
    short: "Demo data · sample merchants, people and sales. Nothing here touches the chain.",
    long: "Demo mode runs Spoke on a sample world in your browser: sample merchants, distributors, buyers and sales, with simulated transactions that use the same steps and the same split math as Monad Testnet. Nothing in demo mode is sent to the chain, and nothing here is evidence of real activity. Your demo changes stay in this browser until you reset or exit.",
  },
  "D-08": {
    topic: "Distributor insights context",
    short: "From Nansen · activity on other networks · context only, never used for payouts",
    long: "These labels and activity come from Nansen and describe this address’s public history on Monad mainnet and other networks Nansen covers, not on Monad Testnet. They can be incomplete or out of date (fetched {date}). Spoke shows them for context and to help spot risk. They never change a payout and they are not a trust score.",
  },
  "D-09": {
    topic: "Privacy: public records",
    short: "Purchases, links and payouts are public onchain records tied to wallet addresses.",
    long: "Everything that moves money on Spoke is a public record on Monad Testnet, tied to wallet addresses. Spoke never puts names, emails or order details onchain, and public graphs and receipts never show buyer contact details. Your profile is private until you choose Public or Pseudonymous. You can export or delete the data Spoke keeps offchain at any time; records on the blockchain can’t be deleted by anyone.",
  },
  "D-10": {
    topic: "Estimated metrics",
    short: "Estimated · counted by Spoke, not the chain",
    long: "Views and clicks are counted by Spoke’s servers and can be incomplete. Sales, commissions and payouts come from the chain.",
  },
  "D-11": {
    topic: "Earnings are not guaranteed",
    short: "Pending earnings are cancelled if the merchant refunds the sale before {unlockAt}.",
    long: "A reward marked pending is cancelled if the merchant refunds the sale before its hold ends. Refunds are issued only by the campaign’s merchant. Rewards are not guaranteed, and nothing on Spoke promises income.",
  },
  "D-12": {
    topic: "Terms for a sale never change",
    short: "Terms for a sale never change after it happens.",
    merchantShort:
      "Terms for a sale never change after it happens. You can publish new terms for future sales with at least 24 hours’ notice.",
    long: "When a sale is accepted, its commission rate, split, paid levels and hold are recorded with it, with the policy hash and version. The merchant can publish new terms for future sales; they take effect at least 24 hours after publishing, the reward token can’t change, and every sale made before then keeps the terms it was made under.",
  },
  "D-13": {
    topic: "Network fees",
    short: "Network fee paid in testnet MON",
    long: "Every onchain action, including creating a link and claiming, costs a small network fee in testnet MON, paid by the account that sends it. New accounts can get a little MON from Spoke’s gas drip, which is rate-limited, or from the Monad faucet.",
  },
  "D-14": {
    topic: "Full policy disclosure",
    long: "Spoke displays eligible referral rewards associated with onchain purchases. Campaign terms, number of eligible referrers, commission amounts, settlement hold and supported token are shown before purchase or participation. In the testnet demonstration, all tokens are for testing and do not represent redeemable currency. A reward marked pending may be reversed if the merchant refunds the associated sale before its unlock timestamp. Rewards are not guaranteed, and being included in a referral path does not prove a particular person’s influence on the buyer. Sharing products for compensation may require an affiliate disclosure under applicable law. Do not use Spoke for prohibited products or deceptive promotions.",
  },
  "D-15": {
    topic: "Not legal or tax advice",
    short: "Spoke doesn’t give legal or tax advice.",
    long: "Earning commissions can come with tax and advertising-disclosure duties depending on where you live. Spoke doesn’t give legal or tax advice and makes no claim that any country approves this model.",
  },
  "D-16": {
    topic: "Illustration",
    short: "Illustration",
    long: "This screen is an illustration with fictional example data.",
  },
} as const satisfies Record<string, DisclosureCopy>;
