import { z } from "zod";
import { errorCodes } from "./errors";
import { minorUnitsString } from "./money";
import { campaignStates, saleStatuses, subsystemHealth } from "./status";
import { distributorRoles } from "./economics";

export const addressString = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Expected a 20-byte address");
export const bytes32String = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Expected 32 bytes of hex");
export const txHashString = bytes32String;
export const uintString = z.string().regex(/^\d+$/, "Expected an unsigned integer string");
export const isoTimestamp = z.iso.datetime({ offset: false });

export const envelope = <T extends z.ZodType>(data: T) =>
  z.object({ requestId: z.string(), timestamp: isoTimestamp, data });

export const apiError = z.object({
  error: z.object({
    code: z.enum(errorCodes),
    message: z.string(),
    retryable: z.boolean(),
    requestId: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiError>;

export const health = z.object({
  api: z.enum(subsystemHealth),
  database: z.enum(subsystemHealth),
  rpc: z.enum(subsystemHealth),
  indexer: z.enum(subsystemHealth),
  chainId: z.number().int(),
  protocolAddress: addressString.nullable(),
});
export type Health = z.infer<typeof health>;

export const authChallengeRequest = z.object({ address: addressString, chainId: z.number().int() });
export const authChallenge = z.object({
  message: z.string(),
  nonce: z.string(),
  expiresAt: isoTimestamp,
});
export const authVerifyRequest = z.object({
  message: z.string(),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});
export const session = z.object({
  address: addressString,
  chainId: z.number().int(),
  expiresAt: isoTimestamp,
});
export type Session = z.infer<typeof session>;

export const tokenInfo = z.object({
  address: addressString,
  symbol: z.string(),
  decimals: z.number().int().min(0).max(36),
});

export const txRef = z.object({
  hash: txHashString,
  blockNumber: uintString,
  explorerUrl: z.url().nullable(),
});
export type TxRef = z.infer<typeof txRef>;

export const rewardLedger = z.object({
  depositedMinor: minorUnitsString,
  availableMinor: minorUnitsString,
  reservedMinor: minorUnitsString,
  claimableMinor: minorUnitsString,
  claimedMinor: minorUnitsString,
  withdrawnMinor: minorUnitsString,
});

export const campaignSummary = z.object({
  campaignId: uintString,
  chainId: z.number().int(),
  protocolAddress: addressString,
  state: z.enum(campaignStates),
  merchant: z.object({ address: addressString, name: z.string() }),
  product: z.object({ title: z.string(), summary: z.string(), imageUrl: z.url().nullable() }),
  token: tokenInfo,
  priceMinor: minorUnitsString,
  commissionBps: z.number().int().min(0).max(10_000),
  maxCommissionPerSaleMinor: minorUnitsString,
  rewardAvailableMinor: minorUnitsString,
  settlementHoldSeconds: z.number().int().nonnegative(),
  startsAt: isoTimestamp,
  endsAt: isoTimestamp,
});
export type CampaignSummary = z.infer<typeof campaignSummary>;

export const campaignList = z.object({
  items: z.array(campaignSummary),
  nextCursor: z.string().nullable(),
});

export const campaignDetail = campaignSummary.extend({
  skuHash: bytes32String,
  product: z.object({
    title: z.string(),
    summary: z.string(),
    description: z.string(),
    imageUrl: z.url().nullable(),
    deliverableType: z.string(),
    refundPolicy: z.string(),
  }),
  rewardLedger,
  nodeCount: z.number().int().nonnegative(),
  saleCount: z.number().int().nonnegative(),
  indexedAt: isoTimestamp.nullable(),
});
export type CampaignDetail = z.infer<typeof campaignDetail>;

export const pathEntry = z.object({
  nodeId: uintString,
  creator: addressString,
  depth: z.number().int().min(0).max(2),
  role: z.enum(distributorRoles),
});

export const referralResolution = z.object({
  slug: z.string(),
  campaignId: uintString,
  nodeId: uintString,
  creator: addressString,
  eligiblePath: z.array(pathEntry).min(1).max(3),
});
export type ReferralResolution = z.infer<typeof referralResolution>;

export const checkoutIntentRequest = z.object({
  campaignId: uintString,
  leafNodeId: uintString.nullable(),
  checkoutKey: bytes32String,
  expectedPriceMinor: minorUnitsString,
  expectedRewardMinor: minorUnitsString,
  chainId: z.number().int(),
});
export type CheckoutIntentRequest = z.infer<typeof checkoutIntentRequest>;

export const checkoutIntent = checkoutIntentRequest.extend({
  id: z.string(),
  buyer: addressString,
  txHash: txHashString.nullable(),
  saleId: uintString.nullable(),
  createdAt: isoTimestamp,
  expiresAt: isoTimestamp,
});
export type CheckoutIntent = z.infer<typeof checkoutIntent>;

export const saleAllocation = z.object({
  recipient: addressString,
  role: z.enum(distributorRoles),
  depth: z.number().int().min(0).max(2),
  amountMinor: minorUnitsString,
});

export const saleReceipt = z.object({
  saleId: uintString,
  campaignId: uintString,
  chainId: z.number().int(),
  protocolAddress: addressString,
  status: z.enum(saleStatuses),
  buyer: addressString,
  token: tokenInfo,
  leafNodeId: uintString.nullable(),
  buyerPaidMinor: minorUnitsString,
  rewardReservedMinor: minorUnitsString,
  allocations: z.array(saleAllocation).max(3),
  purchasedAt: isoTimestamp,
  unlockAt: isoTimestamp,
  purchaseTx: txRef,
  finalizeTx: txRef.nullable(),
  refundTx: txRef.nullable(),
});
export type SaleReceipt = z.infer<typeof saleReceipt>;

export const campaignEarnings = z.object({
  campaignId: uintString,
  productTitle: z.string(),
  token: tokenInfo,
  pendingSettlementMinor: minorUnitsString,
  claimableMinor: minorUnitsString,
  claimedMinor: minorUnitsString,
  reversedMinor: minorUnitsString,
});

export const earnings = z.object({
  address: addressString,
  campaigns: z.array(campaignEarnings),
  indexedAt: isoTimestamp.nullable(),
});
export type Earnings = z.infer<typeof earnings>;
