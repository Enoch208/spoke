export const protocolLimits = {
  maxNodesPerCampaign: 256,
  maxSalesPerCampaign: 100,
  maxRewardedAncestors: 5,
  maxComposerRewardedAncestors: 5,
  hardMaxRewardedAncestors: 8,
  maxPurchasesPerBuyerPerCampaign: 1,
  demoSettlementHoldSeconds: 60,
  defaultSettlementHoldSeconds: 600,
  maxSettlementHoldSeconds: 7_776_000,
  minimumPolicyNoticeSeconds: 86_400,
  maxCampaignDurationSeconds: 31_536_000,
  maxBatchFinalize: 10,
} as const;
