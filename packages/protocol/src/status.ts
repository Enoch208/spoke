export const campaignStates = [
  "DRAFT_OFFCHAIN",
  "CREATED_UNFUNDED",
  "FUNDED_ACTIVE",
  "PAUSED",
  "ENDED",
  "EXPIRED",
] as const;
export type CampaignState = (typeof campaignStates)[number];

export const saleStatuses = ["PENDING", "REFUNDED", "FINALIZED"] as const;
export type SaleStatus = (typeof saleStatuses)[number];

export const onchainSaleStatus = ["NONE", "PENDING", "REFUNDED", "FINALIZED"] as const;
export type OnchainSaleStatus = (typeof onchainSaleStatus)[number];

export const creditSources = ["REWARD", "SALE_PROCEEDS"] as const;
export type CreditSource = (typeof creditSources)[number];

export const txStates = [
  "not_submitted",
  "wallet_confirmation",
  "submitted",
  "included",
  "confirmed",
  "indexed",
  "action_available",
  "failed",
] as const;
export type TxState = (typeof txStates)[number];

export const earningsBuckets = ["pending_settlement", "claimable", "claimed", "reversed"] as const;
export type EarningsBucket = (typeof earningsBuckets)[number];

export const subsystemHealth = ["ok", "degraded", "down", "not_configured"] as const;
export type SubsystemHealth = (typeof subsystemHealth)[number];
