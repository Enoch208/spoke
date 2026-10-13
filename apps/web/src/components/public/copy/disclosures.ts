export const disclosureCopy = {
  heading: "Disclosures",
  affiliateCampaign:
    "People who share this product may earn a commission when it sells. {merchant} pays up to {rate} of each sale from a funded budget, split across up to {people}. Buyers pay the same price either way.",
  affiliateReferral:
    "{sharer} shared this link and may earn a commission if you buy. Up to {people} who passed it on share {rate} of the price, paid by {merchant} from a funded budget. You pay the same price either way.",
  testnet:
    "Prices and rewards on Spoke are in SDUSD on Monad Testnet. Testnet demonstration token. No cash value and no guarantee of redemption.",
  attribution:
    "A referral path records whose links a purchase passed through under this campaign’s rules. It isn’t proof that each person caused the sale.",
  earnings:
    "Sharing doesn’t guarantee earnings. You earn only when a sale through your link settles.",
  sharingRules:
    "When you share, say that you may earn a commission. Don’t promise earnings or results, don’t spam, and don’t buy through your own branch.",
} as const;

export type DisclosureKey = Exclude<keyof typeof disclosureCopy, "heading">;
