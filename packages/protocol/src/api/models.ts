import { z } from "zod";
import { addressString, bytes32String, isoTimestamp, uintString } from "./common";
import {
  campaignStates,
  saleStatuses,
  allocationStates,
  txStates,
  earningsBuckets,
} from "../status";
import { commissionPolicy } from "../policy";
import { errorCodes } from "../errors";
import { accountKind, resourceId, visibilityInput } from "../api-v3";

export const protocolId = z.union([uintString, z.string().regex(/^demo-[\w-]+$/)]);
export const pagedSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });
export const okSchema = z.object({ ok: z.literal(true) });
export const tokenInfo = z.object({
  address: addressString,
  symbol: z.string(),
  decimals: z.number().int().min(0).max(36),
  name: z.string().optional(),
  testnet: z.boolean().optional(),
});
export const txRef = z.object({
  hash: bytes32String,
  blockNumber: uintString,
  explorerUrl: z.url().nullable(),
  at: isoTimestamp.optional(),
});
export const publicActor = z.object({
  address: addressString.nullable(),
  handle: z.string().nullable(),
  displayName: z.string().nullable(),
  visibility: z.enum(["public", "pseudonymous", "private"]),
});
export const countsByState = z.object({
  pending: z.number().int().nonnegative(),
  finalized: z.number().int().nonnegative(),
  refunded: z.number().int().nonnegative(),
});
export const sixBuckets = z.object(
  Object.fromEntries(earningsBuckets.map((key) => [key, uintString])) as Record<
    (typeof earningsBuckets)[number],
    typeof uintString
  >,
);
export const rewardLedger = z.object({
  netDeposited: uintString,
  available: uintString,
  pendingReserved: uintString,
  vestedUnclaimed: uintString,
  rewardsClaimed: uintString,
  surplusWithdrawn: uintString,
});
export const proceedsLedger = z.object({
  proceedsPending: uintString,
  proceedsClaimable: uintString,
  proceedsClaimed: uintString,
  buyerRefunded: uintString,
});
export const policyVersion = commissionPolicy.safeExtend({
  policyHash: bytes32String,
  version: z.number().int().positive(),
  effectiveAt: isoTimestamp,
  regions: z.array(z.string()),
  sharingRules: z.array(z.string()),
  registrationTx: txRef.nullable().optional(),
  salesCount: z.number().int().nonnegative().optional(),
});
export const campaignPolicy = z.object({
  current: policyVersion,
  scheduled: policyVersion.nullable(),
  history: z.array(policyVersion),
});
export const asset = z.object({
  id: resourceId,
  kind: z.enum(["image", "download"]),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[\da-f]{64}$/),
  url: z.url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export const productMissing = [
  "title",
  "outcome",
  "description",
  "category",
  "cover",
  "coverAlt",
  "price",
  "deliverable",
] as const;
export const product = z.object({
  id: resourceId,
  merchantId: resourceId,
  title: z.string(),
  summary: z.string(),
  outcome: z.string(),
  description: z.string(),
  media: z.array(asset),
  priceBaseUnits: uintString,
  token: tokenInfo,
  category: z.string(),
  fulfillmentMode: z.enum(["download", "external", "manual"]),
  deliverable: z.string().min(1).max(2048).optional(),
  version: z.number().int().positive(),
  skuHash: bytes32String,
  refundPolicy: z.string(),
  variants: z.array(z.object({ id: resourceId, name: z.string(), priceBaseUnits: uintString })),
  billingPeriod: z.enum(["monthly", "yearly"]).nullable(),
  status: z.enum(["draft", "ready", "archived"]).optional(),
  missing: z.array(z.enum(productMissing)).optional(),
  coverUrl: z.url().nullable().optional(),
  coverAlt: z.string().nullable().optional(),
  accessTiming: z.enum(["afterPurchase", "afterHold"]).optional(),
  liveCampaignCount: z.number().int().nonnegative().optional(),
  usedBy: z
    .array(
      z.object({
        campaignId: protocolId,
        name: z.string(),
        state: z.enum(campaignStates),
        productVersion: z.number().int().positive(),
      }),
    )
    .optional(),
  updatedAt: isoTimestamp.optional(),
});
export const merchantProfile = z.object({
  id: resourceId,
  name: z.string(),
  slug: z.string(),
  address: addressString,
  description: z.string(),
  logo: z.url().nullable(),
  website: z.url().nullable(),
  verificationTier: z.enum(["unverified", "domain", "business"]),
  joinedAt: isoTimestamp,
  offersCount: z.number().int().nonnegative(),
  closedAt: isoTimestamp.nullable(),
  category: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
  supportEmail: z.email().optional(),
  moderation: z
    .object({
      state: z.enum(["visible", "hidden"]),
      actions: z.array(
        z.object({ at: isoTimestamp, action: z.string(), reasonCategory: z.string() }),
      ),
    })
    .optional(),
});
export const merchantOrg = merchantProfile.extend({
  supportEmail: z.email(),
  region: z.string(),
  defaults: commissionPolicy.nullable(),
  budgetAlertSales: z.number().int().min(1).max(50),
  agreement: z.object({
    version: z.string(),
    publishedAt: isoTimestamp,
    url: z.url(),
    acceptedAt: isoTimestamp,
  }),
  businessWallet: addressString,
  showSupportEmail: z.boolean().optional(),
});
export const campaignCard = z.object({
  campaignId: protocolId,
  chainId: z.number().int(),
  contractAddress: addressString,
  state: z.enum(campaignStates),
  merchant: merchantProfile.pick({ name: true, slug: true, address: true }),
  product: product.pick({ id: true, title: true, summary: true, media: true, category: true }),
  token: tokenInfo,
  price: uintString,
  policy: policyVersion,
  rewardAvailable: uintString,
  rewardTotal: uintString,
  settledSales: z.number().int().nonnegative(),
  onchainUrl: z.url(),
  rankReasons: z.array(z.string()),
  inviteOnly: z.boolean().optional(),
  endsAt: isoTimestamp.optional(),
});
export const campaignDetail = campaignCard.extend({
  product,
  rewardLedger,
  proceedsLedger,
  startsAt: isoTimestamp,
  endsAt: isoTimestamp,
  counts: countsByState,
  nodeCount: z.number().int().nonnegative(),
  inviteOnly: z.boolean(),
  moderation: z.object({ hidden: z.boolean(), reason: z.string().nullable() }),
  capacity: z.object({
    nodes: z.number().int().nonnegative(),
    sales: z.number().int().nonnegative(),
  }),
  trustMode: z.enum(["NATIVE_ONCHAIN", "MERCHANT_ATTESTED", "THIRD_PARTY_VERIFIED"]),
  creationTx: txRef,
  fundingTxs: z.array(txRef),
  indexedAt: isoTimestamp.nullable(),
  metadataHash: bytes32String.optional(),
});
export const campaignStats = z.object({
  links: z.number().int().nonnegative(),
  branches: z.number().int().nonnegative(),
  deepestLevel: z.number().int().nonnegative(),
  sales: countsByState,
  settledValue: uintString,
  reservedRewards: uintString,
  depthMix: z.array(
    z.object({ level: z.number().int().positive(), sales: z.number().int().nonnegative() }),
  ),
});
export const campaignDraft = z.object({
  draftId: resourceId,
  version: z.number().int().positive(),
  savedAt: isoTimestamp,
  stepReached: z.number().int().min(0).max(5),
  mode: z.enum(["create", "newVersion"]),
  campaignId: protocolId.optional(),
  productId: resourceId,
  productVersion: z.number().int().positive(),
  policy: commissionPolicy,
  endsAt: isoTimestamp,
  effectiveAt: isoTimestamp.optional(),
  inviteOnly: z.boolean(),
  name: z.string().optional(),
  deposit: uintString.optional(),
  budgetAlertSales: z.number().int().min(1).max(50).optional(),
  endPreset: z.enum(["30d", "90d", "180d", "365d", "custom"]).optional(),
  refundTerms: z.string().optional(),
  regions: z.array(z.string()).optional(),
  disclosure: z.string().optional(),
  cohort: z.array(addressString).optional(),
  templateId: resourceId.optional(),
});
export const preparedCampaign = z.object({
  metadataHash: bytes32String,
  policy: commissionPolicy,
  policyHash: bytes32String,
  eligibilityHash: bytes32String,
  productVersion: z.number().int().positive(),
  gasEstimate: uintString.nullable(),
  expectedEvents: z.array(z.string()),
  cohortEnforcement: z.enum(["onchain", "offchain"]),
  mode: z.enum(["create", "newVersion"]),
  config: z.object({ skuHash: bytes32String, skuPrice: uintString }).optional(),
  earliestEffectiveAt: isoTimestamp.optional(),
  diff: z.array(z.object({ field: z.string(), before: z.json(), after: z.json() })).optional(),
});
export const me = z.object({
  address: addressString,
  accountKind,
  handle: z.string().nullable(),
  displayName: z.string(),
  avatarSeed: z.string(),
  bio: z.string(),
  website: z.url().nullable(),
  onboarding: z.object({
    intent: z.enum(["buy", "earn", "sell"]).nullable(),
    completedAt: isoTimestamp.nullable(),
  }),
  recovery: z.object({ checkedAt: isoTimestamp.nullable() }),
  handleChangedAt: isoTimestamp.nullable(),
  handleChangeAvailableAt: isoTimestamp.nullable(),
  payoutAddress: addressString,
  workspaces: z.array(merchantOrg),
  isMerchant: z.boolean(),
  isOperator: z.boolean(),
  createdAt: isoTimestamp,
  visibility: visibilityInput.optional(),
});
export const session = z.object({
  address: addressString,
  chainId: z.number().int(),
  expiresAt: isoTimestamp,
  isNewAccount: z.boolean(),
  csrfToken: z.string(),
});
export const confirmation = z.object({ confirmationToken: z.string(), expiresAt: isoTimestamp });
export const authChallenge = z.object({
  message: z.string(),
  nonce: z.string(),
  expiresAt: isoTimestamp,
});
export const preferences = z.object({
  displayCurrency: z.enum(["SDUSD", "USD", "NGN", "EUR", "GBP"]),
  theme: z.enum(["system", "light", "dark"]),
  language: z.literal("en"),
  startWorkspace: z.enum(["buy", "earn", "sell"]),
  earnChecklistHidden: z.boolean(),
  sellChecklistHidden: z.boolean().optional(),
});
export const balances = z.object({
  monWei: uintString,
  sdusd: uintString.nullable(),
  sdusdAllowanceToProtocol: uintString.nullable(),
  blockNumber: uintString,
});
export const passkey = z.object({
  credentialId: z.string(),
  label: z.string(),
  kind: z.enum(["original", "added"]),
  deviceHint: z.string(),
  createdAt: isoTimestamp,
  lastUsedAt: isoTimestamp.nullable(),
  hasVault: z.boolean(),
});
export const linkedWallet = z.object({
  address: addressString,
  kind: accountKind,
  derivationIndex: z.number().int().min(0).max(4).nullable(),
  walletName: z.string().nullable(),
  label: z.string(),
  isPayout: z.boolean(),
  isCurrentSigner: z.boolean(),
  linkedAt: isoTimestamp,
});
export const deviceSession = z.object({
  id: resourceId,
  deviceLabel: z.string(),
  method: accountKind,
  signedInAt: isoTimestamp,
  lastActiveAt: isoTimestamp,
  expiresAt: isoTimestamp,
  isCurrent: z.boolean(),
});
export const exportJob = z.object({
  jobId: resourceId,
  status: z.enum(["queued", "running", "ready", "failed"]),
  url: z.string().nullable(),
  expiresAt: isoTimestamp.optional(),
});
export const handleAvailability = z.object({
  available: z.boolean(),
  reason: z.enum(["taken", "reserved", "invalid"]).nullable(),
  suggestions: z.array(z.string()).max(3),
});
export const activityRow = z.object({
  kind: z.string(),
  amount: uintString.nullable(),
  token: tokenInfo.nullable(),
  txHash: bytes32String,
  blockNumber: uintString,
  status: z.enum(txStates),
  objectId: resourceId,
  at: isoTimestamp,
});
export const notification = z.object({
  id: resourceId,
  kind: z.string().regex(/^[a-z][\w]*\.[a-z][\w]*$/),
  category: z.string(),
  title: z.string(),
  body: z.string(),
  amount: uintString.optional(),
  href: z.string(),
  workspace: z.enum(["earn", "sell", "account"]),
  readAt: isoTimestamp.nullable(),
  createdAt: isoTimestamp,
});
export const gasStates = [
  "eligible",
  "sending",
  "received",
  "already_received",
  "balance_sufficient",
  "device_limit",
  "station_empty",
  "wallet_account",
  "failed",
  "unavailable",
  "not_configured",
] as const;
export const fundingStatus = balances.extend({
  chainId: z.number().int(),
  faucetLimit: uintString.nullable(),
  covers: z
    .object({
      createNode: z.boolean(),
      purchase: z.boolean(),
      finalizeSale: z.boolean(),
      claimRewards: z.boolean(),
    })
    .nullable(),
  gas: z.object({
    state: z.enum(gasStates),
    dripAmount: uintString.nullable(),
    lastDripAt: isoTimestamp.nullable(),
    lastDripTxHash: bytes32String.nullable(),
    nextEligibleAt: isoTimestamp.nullable(),
  }),
});
export const gasDrip = z.object({ txHash: bytes32String, amount: uintString });
export const pathEntry = z.object({
  nodeId: protocolId,
  creator: publicActor,
  depth: z.number().int().nonnegative(),
  paid: z.boolean(),
  repeatedWallet: z.boolean(),
  outsideWindow: z.boolean(),
  effectiveWeightBps: z.number().int().min(0).max(10000),
  amount: uintString,
  state: z.enum(allocationStates).nullable(),
  reasonIfUnpaid: z
    .enum(["OUTSIDE_DEPTH", "CAMPAIGN_EXCLUSION", "REFUNDED", "REVERSED"])
    .nullable(),
});
export const graphNode = z.object({
  nodeId: protocolId,
  campaignId: protocolId,
  parentNodeId: protocolId,
  owner: publicActor,
  depth: z.number().int().nonnegative(),
  childCount: z.number().int().nonnegative(),
  hiddenChildCount: z.number().int().nonnegative(),
  counts: countsByState,
  moderationFlag: z.boolean(),
  activity: z.array(activityRow),
});
export const graphSlice = z.object({
  nodes: z.array(graphNode),
  edges: z.array(z.object({ from: protocolId, to: protocolId })),
  saleMarkers: z.array(
    z.object({ saleId: protocolId, nodeId: protocolId, state: z.enum(saleStatuses) }),
  ),
  truncated: z.boolean(),
  indexedBlock: uintString.nullable(),
});
export const referralResolution = z.object({
  status: z.enum(["ok", "unknown", "retired", "otherChain"]),
  slug: z.string(),
  chainId: z.number().int(),
  campaignId: protocolId,
  nodeId: protocolId,
  parentNodeId: protocolId,
  owner: publicActor,
  eligiblePath: z.array(pathEntry).max(8),
  depth: z.number().int().nonnegative(),
  indexingStatus: z.enum(["live", "syncing", "behind"]),
});
export const linkRow = z.object({
  nodeId: protocolId,
  code: z.string(),
  url: z.url(),
  campaign: campaignCard,
  parentNodeId: protocolId,
  levelFromMerchant: z.number().int().nonnegative(),
  campaignStatus: z.enum(campaignStates),
  moderation: z.object({
    state: z.enum(["visible", "hidden", "flagged"]),
    reason: z.string().nullable(),
    decidedAt: isoTimestamp.nullable(),
  }),
  visitsEstimate: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  earned: sixBuckets,
  createdTxHash: bytes32String,
  createdAt: isoTimestamp,
});
export const linkStats = z.object({
  nodeId: protocolId,
  visitsEstimate: z.number().int().nonnegative(),
  visitsBySource: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().nonnegative(),
      estimate: z.literal(true),
    }),
  ),
  estimate: z.literal(true),
  directChildren: z.number().int().nonnegative(),
  descendants: z.number().int().nonnegative(),
  maxDepthBelow: z.number().int().nonnegative(),
  sales: countsByState,
  earned: sixBuckets,
});
export const publicLinkRow = linkRow.extend({ visitsEstimate: z.null(), earned: z.null() });
export const joinPreview = z.object({
  eligibility: z.enum([
    "ok",
    "already_joined",
    "is_merchant",
    "invitation_required",
    "paused",
    "ended",
    "capacity_reached",
    "invalid_parent",
    "not_deployed",
  ]),
  nodeId: protocolId.nullable(),
  enforcedBy: z.enum(["contract", "spoke"]),
  budgetState: z.enum(["funded", "unfunded", "exhausted"]),
  depth: z.number().int().nonnegative(),
  ancestorsAbove: z.array(pathEntry),
  policy: policyVersion.nullable(),
  exampleAmounts: z.array(uintString),
});
export const checkoutPreview = z.object({
  price: uintString,
  recipients: z.array(pathEntry).max(8),
  rewardTotal: uintString,
  unallocated: uintString,
  policyHash: bytes32String,
  policyVersion: z.number().int().positive(),
  nextPolicy: z.object({ policyHash: bytes32String, effectiveAt: isoTimestamp }).nullable(),
  directPurchaseAvailable: z.boolean(),
  blockNumber: uintString,
  holdSeconds: z.number().int(),
  refundPolicy: z.string(),
  blocking: z.object({ code: z.enum(errorCodes), contractError: z.string().nullable() }).nullable(),
  buyer: z
    .object({
      tokenBalance: uintString,
      allowance: uintString,
      monWei: uintString,
      alreadyPurchasedSaleId: protocolId.nullable(),
      buyerOnPath: z.boolean(),
      buyerIsMerchant: z.boolean(),
    })
    .optional(),
  feeEstimate: z
    .object({
      gasUnits: uintString,
      gasPriceWei: uintString,
      feeWei: uintString,
      basis: z.enum(["estimate", "recentPurchase", "sample"]),
    })
    .optional(),
});
export const checkoutIntent = z.object({
  id: resourceId,
  campaignId: protocolId,
  nodeId: protocolId,
  orderKey: bytes32String,
  expectedPrice: uintString,
  expectedReward: uintString,
  policyHash: bytes32String,
  chainId: z.number().int(),
  buyer: addressString,
  status: z.enum(["created", "submitted", "included", "confirmed", "expired", "failed"]),
  txHash: bytes32String.nullable(),
  saleId: protocolId.nullable(),
  createdAt: isoTimestamp,
  expiresAt: isoTimestamp,
  to: addressString,
  data: z.string().regex(/^0x[\da-fA-F]*$/),
  value: uintString,
});
export const saleAllocation = z.object({
  recipient: publicActor,
  level: z.number().int().min(1).max(8),
  effectiveWeightBps: z.number().int().min(0).max(10000),
  amount: uintString,
  state: z.enum(allocationStates),
  claimTx: txRef.nullable(),
});
export const saleReceipt = z.object({
  saleId: protocolId,
  campaignId: protocolId,
  chainId: z.number().int(),
  contractAddress: addressString,
  buyer: addressString.nullable(),
  nodeId: protocolId,
  orderKey: bytes32String,
  policyHash: bytes32String,
  policyVersion: z.number().int().positive(),
  source: z.enum(["native", "merchant_attested"]),
  trustMode: z.enum(["NATIVE_ONCHAIN", "MERCHANT_ATTESTED", "THIRD_PARTY_VERIFIED"]),
  price: uintString,
  rewardReserved: uintString,
  token: tokenInfo,
  state: z.enum(saleStatuses),
  purchasedAt: isoTimestamp,
  unlockAt: isoTimestamp,
  allocations: z.array(saleAllocation).max(8),
  proceedsState: z.enum(["pending", "claimable", "claimed", "refunded"]),
  purchaseTx: txRef,
  finalizeTx: txRef.nullable(),
  refundTx: txRef.nullable(),
  indexedBlock: uintString,
  timeline: z.array(z.object({ state: z.string(), at: isoTimestamp, tx: txRef })),
  refundRequest: z
    .object({ disputeId: resourceId, status: z.string(), createdAt: isoTimestamp })
    .nullable()
    .optional(),
});
export const proofEvent = z.object({
  name: z.string(),
  tx: txRef,
  logIndex: z.number().int().nonnegative(),
  at: isoTimestamp,
  actor: publicActor.nullable(),
  args: z.record(
    z.string(),
    z.union([z.string(), z.number().int(), z.boolean(), z.array(z.string())]),
  ),
});
export const conversionEarning = z.object({
  saleId: protocolId,
  campaignId: protocolId,
  token: tokenInfo,
  level: z.number().int().min(1).max(8),
  pathLength: z.number().int().positive(),
  effectiveWeightBps: z.number().int().min(0).max(10000),
  amount: uintString,
  state: z.enum(allocationStates),
  unlockAt: isoTimestamp,
  finalizedAt: isoTimestamp.nullable(),
  claimTxHash: bytes32String.nullable(),
  evidence: z.array(txRef),
  productTitle: z.string().optional(),
  purchasedAt: isoTimestamp.optional(),
  refundRequested: z.boolean().optional(),
});
export const campaignEarnings = sixBuckets.extend({
  campaignId: protocolId,
  token: tokenInfo,
  productTitle: z.string(),
  sales: countsByState,
});
export const earningsSummary = z.object({
  tokens: z.array(sixBuckets.extend({ token: tokenInfo })),
  nextUnlockAt: isoTimestamp.nullable(),
  indexedBlock: uintString.nullable(),
  blockNumber: uintString,
});
export const claimable = z.object({
  tokens: z.array(
    z.object({
      token: tokenInfo,
      amount: uintString,
      campaigns: z.array(z.object({ campaignId: protocolId, amount: uintString })),
    }),
  ),
  blockNumber: uintString,
  readyToFinalize: z.array(conversionEarning),
});
export const vaultLedger = z.object({
  campaigns: z.array(
    z.object({
      campaignId: protocolId,
      token: tokenInfo,
      rewards: rewardLedger,
      proceeds: proceedsLedger,
      rewardPerSale: uintString,
      liabilityCap: uintString,
      settledSalesReadyToFinalize: z.array(protocolId),
    }),
  ),
  totals: z.array(z.object({ token: tokenInfo, rewards: rewardLedger, proceeds: proceedsLedger })),
  lastIndexedBlock: uintString.nullable(),
  blockNumber: uintString,
});
export const reputationGroupTotals = z.object({
  name: z.string().optional(),
  settledCommission: uintString.optional(),
  refunded: z.number().int().nonnegative().optional(),
  levels: z
    .array(z.object({ level: z.number().int().positive(), count: z.number().int().positive() }))
    .optional(),
  lastSettledAt: isoTimestamp.nullable().optional(),
  token: tokenInfo.optional(),
});
export const reputationPeriods = ["all", "90d", "30d"] as const;
export const partnerPassport = z.object({
  history: z.array(
    z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      direct: z.number().int().nonnegative(),
      network: z.number().int().nonnegative(),
      receiptIds: z.array(protocolId),
    }),
  ),
  positions: z.array(
    z.object({
      campaignId: protocolId,
      title: z.string(),
      merchant: publicActor,
      nodeId: protocolId,
      parentNodeId: protocolId,
      joinedAt: isoTimestamp,
      direct: z.number().int().nonnegative(),
      network: z.number().int().nonnegative(),
      receiptIds: z.array(protocolId),
    }),
  ),
  rewards: z
    .object({
      token: tokenInfo,
      claimable: uintString,
      claimed: uintString,
      receiptIds: z.array(protocolId),
    })
    .nullable(),
});
export const reputationProfile = z.object({
  passport: partnerPassport.nullable().optional(),
  subject: addressString.nullable(),
  handle: z.string().nullable(),
  displayName: z.string().nullable(),
  methodologyVersion: z.string(),
  evidencePeriod: z.object({ from: isoTimestamp.nullable(), to: isoTimestamp.nullable() }),
  settledConversions: z.number().int().nonnegative(),
  directConversions: z.number().int().nonnegative(),
  networkConversions: z.number().int().nonnegative(),
  netAttributedValue: uintString,
  settledCommission: uintString,
  median: uintString.nullable(),
  merchantCount: z.number().int().nonnegative(),
  campaignCount: z.number().int().nonnegative(),
  refundAdjustment: uintString,
  lastIndexedBlock: uintString.nullable(),
  verificationTier: z.string(),
  evidence: pagedSchema(saleReceipt),
  perMerchant: z.array(
    reputationGroupTotals.extend({
      merchantId: resourceId,
      receiptIds: z.array(protocolId),
      settledConversions: z.number().int().nonnegative(),
    }),
  ),
  perCampaign: z.array(
    reputationGroupTotals.extend({
      campaignId: protocolId,
      receiptIds: z.array(protocolId),
      settledConversions: z.number().int().nonnegative(),
    }),
  ),
  perCategory: z
    .array(
      reputationGroupTotals.extend({
        category: z.string(),
        receiptIds: z.array(protocolId),
        settledConversions: z.number().int().nonnegative(),
      }),
    )
    .optional(),
  period: z.enum(reputationPeriods).optional(),
  totalsByToken: z
    .array(
      z.object({
        token: tokenInfo,
        netAttributedValue: uintString.nullable(),
        settledCommission: uintString.nullable(),
        refundAdjustment: uintString.nullable(),
      }),
    )
    .optional(),
  pendingConversions: z.number().int().nonnegative(),
  visibility: z.enum(["public", "pseudonymous", "private"]),
  acceptsInvitations: z.boolean(),
});
export const publicReputationProfile = reputationProfile.extend({
  settledConversions: z.number().int().nonnegative().nullable(),
  directConversions: z.number().int().nonnegative().nullable(),
  networkConversions: z.number().int().nonnegative().nullable(),
  netAttributedValue: uintString.nullable(),
  settledCommission: uintString.nullable(),
  merchantCount: z.number().int().nonnegative().nullable(),
  campaignCount: z.number().int().nonnegative().nullable(),
  refundAdjustment: uintString.nullable(),
  pendingConversions: z.number().int().nonnegative().nullable(),
  visibleFields: z.array(z.string()),
  indexing: z.enum(["index", "noindex"]),
});
export type Me = z.infer<typeof me>;
export type Session = z.infer<typeof session>;
export type TokenInfo = z.infer<typeof tokenInfo>;
export type CampaignDetail = z.infer<typeof campaignDetail>;
export type CampaignDraft = z.infer<typeof campaignDraft>;
export type SaleReceipt = z.infer<typeof saleReceipt>;
export type EarningsSummary = z.infer<typeof earningsSummary>;
