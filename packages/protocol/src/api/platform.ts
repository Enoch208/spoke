import { z } from "zod";
import { resourceId } from "../api-v3";
import { addressString, bytes32String, isoTimestamp, uintString } from "./common";
import { commissionPolicy } from "../policy";
import { allocationStates } from "../status";
import {
  countsByState,
  exportJob,
  pagedSchema,
  protocolId,
  publicActor,
  sixBuckets,
  tokenInfo,
  txRef,
  rewardLedger,
  proceedsLedger,
} from "./models";

export const period = z.object({ from: isoTimestamp, to: isoTimestamp });
export const activityItem = z.object({
  kind: z.enum([
    "salePending",
    "saleSettled",
    "saleRefunded",
    "saleFinalized",
    "linkCreated",
    "claimed",
    "funded",
    "paused",
    "resumed",
    "ended",
    "termsPublished",
  ]),
  actor: publicActor,
  amount: uintString.nullable(),
  tx: txRef,
  at: isoTimestamp,
  saleId: protocolId.optional(),
});
export const merchantCampaignRow = z.object({
  campaignId: protocolId.nullable(),
  draftId: resourceId.nullable(),
  state: z.string(),
  productTitle: z.string(),
  rewardPerSale: uintString,
  policy: commissionPolicy,
  source: z.string(),
  trustMode: z.string(),
  eligibility: z.string(),
  availableRewards: uintString,
  pendingSales: z.number().int().nonnegative(),
  proceedsClaimable: uintString,
  sales: countsByState,
  links: z.number().int().nonnegative(),
  budgetAlertSales: z.number().int().min(1).max(50),
  endsAt: isoTimestamp,
  scheduledPolicyHash: bytes32String.nullable(),
  productId: resourceId.optional(),
  name: z.string().optional(),
  savedAt: isoTimestamp.optional(),
  stepReached: z.number().int().min(0).max(5).optional(),
  settledValue: uintString.optional(),
  updatedAt: isoTimestamp.optional(),
});
export const campaignDistributorRow = z.object({
  address: addressString,
  handle: z.string().nullable(),
  parentNodeId: protocolId,
  nodeId: protocolId,
  linkCount: z.number().int().nonnegative(),
  descendants: z.number().int().nonnegative(),
  directSales: z.number().int().nonnegative(),
  paidSales: z.number().int().nonnegative(),
  rewards: sixBuckets,
  lastActivityAt: isoTimestamp.nullable(),
  invitationStatus: z.string().nullable(),
});
export const merchantRecord = z.object({
  sales: countsByState,
  refundRateBps: z.number().int().min(0).max(10000),
  medianRefundSeconds: z.number().int().nonnegative().nullable(),
  rewardsDeposited: uintString,
  rewardsEarned: uintString,
  rewardsWithdrawn: uintString,
  indexedBlock: uintString.nullable(),
});
export const purchaseRow = z.object({
  saleId: protocolId,
  chainId: z.number().int(),
  campaignId: protocolId,
  productTitle: z.string(),
  image: z.url().nullable(),
  merchantName: z.string(),
  referrerHandle: z.string().nullable(),
  amountPaid: uintString,
  purchasedAt: isoTimestamp,
  state: z.enum(["PENDING", "FINALIZED", "REFUNDED"]),
  unlockAt: isoTimestamp,
  refundedAt: isoTimestamp.nullable(),
  refundRequestStatus: z.string().nullable(),
  token: tokenInfo.optional(),
  finalizedAt: isoTimestamp.nullable().optional(),
});
export const saleRow = purchaseRow.extend({
  orderKey: bytes32String,
  reward: uintString,
  paidCount: z.number().int().min(0).max(8),
  maxPaid: z.number().int().min(1).max(8),
  trustMode: z.string(),
  proceedsState: z.enum(["pending", "claimable", "claimed", "refunded"]),
  buyer: addressString.optional(),
});
export const missedEarning = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sale"),
    reason: z.enum(["OUTSIDE_DEPTH", "CAMPAIGN_EXCLUSION", "REFUNDED", "REVERSED"]),
    campaignId: protocolId,
    nodeId: protocolId,
    saleId: protocolId,
    position: z.number().int().positive().nullable(),
    maxRewardedAncestors: z.number().int().min(1).max(8),
    ruleLabel: z.string().nullable(),
    at: isoTimestamp,
    evidence: z.array(txRef),
  }),
  z.object({
    kind: z.literal("blocked_checkout"),
    reason: z.enum(["SELF_REFERRAL", "INVALID_BUYER", "DEPLETED_POOL", "CAMPAIGN_INACTIVE"]),
    campaignId: protocolId,
    nodeId: protocolId,
    at: isoTimestamp,
    evidence: z.array(txRef),
  }),
]);
export const claimRow = z.object({
  tx: txRef,
  amount: uintString,
  token: tokenInfo,
  campaignId: protocolId,
  source: z.enum(["REWARD", "SALE_PROCEEDS"]),
  at: isoTimestamp,
});
export const vaultMovement = claimRow.extend({
  kind: z.enum(["deposited", "reserved", "finalized", "refunded", "claimed", "withdrawn"]),
  saleId: protocolId.nullable(),
});
export const distributorCard = z.object({
  address: addressString.nullable(),
  handle: z.string().nullable(),
  displayName: z.string().nullable(),
  visibility: z.enum(["public", "pseudonymous"]),
  settledConversions: z.number().int().nonnegative().nullable(),
  merchantCount: z.number().int().nonnegative().nullable(),
  categories: z.array(z.string()),
  lastSettledAt: isoTimestamp.nullable(),
  rankSignals: z.array(z.object({ name: z.string(), value: z.number() })),
  slot: z.enum(["ranked", "new"]),
  rankingVersion: z.literal("discovery-v1"),
  methodologyVersion: z.string(),
  isPartner: z.boolean(),
});
export const partnerRow = distributorCard.extend({
  linkCount: z.number().int().nonnegative(),
  directSales: z.number().int().nonnegative(),
  networkSales: z.number().int().nonnegative(),
  settledValue: uintString,
  rewards: sixBuckets,
  firstLinkAt: isoTimestamp,
  lastSettledAt: isoTimestamp.nullable(),
});
export const invitation = z.object({
  id: resourceId,
  distributor: addressString,
  campaignId: protocolId,
  merchantId: resourceId,
  message: z.string(),
  terms: z.string(),
  parentNodeId: protocolId.nullable(),
  policyHash: bytes32String,
  status: z.enum(["pending", "accepted", "declined", "withdrawn", "expired"]),
  expiresAt: isoTimestamp,
  withdrawnAt: isoTimestamp.nullable(),
  createdAt: isoTimestamp,
});
export const distributorInsights = z.object({
  status: z.enum(["available", "no_history", "none"]),
  source: z.string().nullable(),
  fetchedAt: isoTimestamp.nullable(),
  labels: z.array(z.string()),
  networks: z.array(z.string()),
  scopeNote: z.string(),
  activitySummary: z
    .object({
      transactions: z.number().int().nonnegative().nullable(),
      lastActiveAt: isoTimestamp.nullable(),
    })
    .nullable(),
  reviewSignals: z.array(z.object({ label: z.string(), reason: z.string() })),
});
export const policyTemplate = z.object({
  id: resourceId,
  name: z.string(),
  policy: commissionPolicy,
  status: z.enum(["active", "archived"]),
  createdAt: isoTimestamp,
  category: z.string().nullable().optional(),
  description: z.string().optional(),
  version: z.number().int().positive().optional(),
  updatedAt: isoTimestamp.optional(),
  history: z
    .array(
      z.object({
        version: z.number().int().positive(),
        policy: commissionPolicy,
        savedAt: isoTimestamp,
      }),
    )
    .optional(),
  usedBy: z
    .array(z.object({ campaignId: protocolId, version: z.number().int().positive() }))
    .optional(),
});
export const simulationResult = z.object({
  policyHash: bytes32String,
  simulations: z.array(
    z.object({
      pathLength: z.number().int().nonnegative(),
      weightsBps: z.array(z.number().int()),
      amounts: z.array(uintString),
      reserved: uintString,
      unallocated: uintString,
    }),
  ),
  contractChecks: z
    .array(
      z.object({
        nodeId: protocolId,
        pathLength: z.number().int().nonnegative(),
        amounts: z.array(uintString),
        rewardTotal: uintString,
        matches: z.boolean(),
        blockNumber: uintString,
      }),
    )
    .optional(),
});
export const disputeEvent = z.object({
  id: resourceId,
  at: isoTimestamp,
  actor: publicActor,
  kind: z.string(),
  message: z.string(),
  tx: txRef.nullable(),
});
export const dispute = z.object({
  id: resourceId,
  saleId: protocolId,
  campaignId: protocolId,
  kind: z.enum(["refund_request", "attribution_appeal", "moderation_appeal", "chargeback"]),
  status: z.enum(["open", "refunded", "declined", "explained", "escalated", "appealed", "covered"]),
  reason: z.string(),
  message: z.string(),
  createdAt: isoTimestamp,
  events: z.array(disputeEvent),
});
export const chartPoint = z.object({
  at: isoTimestamp,
  sales: countsByState,
  value: uintString,
  rewards: uintString,
  links: z.number().int().nonnegative(),
});
export const merchantAnalytics = z.object({
  period,
  series: z.array(chartPoint),
  totals: chartPoint,
  previousPeriodTotals: chartPoint.nullable(),
  depthMix: z.array(
    z.object({
      depth: z.number().int().positive(),
      sales: z.number().int().nonnegative(),
      rewards: uintString,
    }),
  ),
  networkGrowth: z.array(chartPoint),
  funnel: z.array(
    z.object({ stage: z.string(), count: z.number().int().nonnegative(), estimate: z.boolean() }),
  ),
  cohortGrid: z.array(
    z.object({ cohort: isoTimestamp, periods: z.array(z.number().nonnegative()) }),
  ),
  byCampaign: z.array(z.object({ campaignId: protocolId, totals: chartPoint })),
});
export const reconciliation = z.object({
  matches: z.boolean(),
  blockNumber: uintString,
  rewardIndex: rewardLedger,
  rewardChain: rewardLedger,
  proceedsIndex: proceedsLedger,
  proceedsChain: proceedsLedger,
  mismatches: z.array(
    z.object({
      campaignId: protocolId,
      field: z.string(),
      indexed: uintString,
      canonical: uintString,
    }),
  ),
});
export const reportRun = exportJob.extend({
  kind: z.enum(["sales", "vault", "distributorEarnings", "partners", "analytics"]),
  period,
  campaignIds: z.array(protocolId),
  blockNumber: uintString,
  rows: z.number().int().nonnegative(),
  size: z.number().int().nonnegative(),
  sha256: z
    .string()
    .regex(/^[\da-f]{64}$/)
    .nullable(),
  createdAt: isoTimestamp,
});
export const billingSummary = z.object({
  feeBps: z.literal(0),
  period,
  totals: z.array(
    z.object({ token: tokenInfo, settledValue: uintString, protocolFees: uintString }),
  ),
});
export const invoice = z.object({
  id: resourceId,
  period,
  amount: uintString,
  currency: z.string(),
  status: z.enum(["draft", "issued", "paid", "void"]),
  url: z.url().nullable(),
});
export const integration = z.object({
  id: resourceId,
  provider: z.enum(["shopify", "stripe", "woocommerce"]),
  status: z.enum(["connected", "disconnected", "error", "pending"]),
  connectedAt: isoTimestamp.nullable(),
  lastSyncAt: isoTimestamp.nullable(),
});
export const integrationMismatch = z.object({
  id: resourceId,
  kind: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  sourceOrderId: z.string(),
  saleId: protocolId.nullable(),
  suggestedAction: z.string(),
});
export const integrationStatus = z.object({
  lastSyncAt: isoTimestamp.nullable(),
  pendingOrders: z.number().int().nonnegative(),
  sourceTotal: uintString,
  attestedTotal: uintString,
  acceptedTotal: uintString,
  mismatches: z.array(integrationMismatch),
});
export const orderSigner = z.object({
  id: resourceId,
  address: addressString,
  scopes: z.array(z.string()),
  limits: z.object({ perOrder: uintString, daily: uintString }),
  expiry: isoTimestamp,
  revokedAt: isoTimestamp.nullable(),
  usedToday: uintString,
});
export const attestation = z.object({
  id: resourceId,
  orderHash: bytes32String,
  nonce: uintString,
  campaignId: protocolId,
  amount: uintString,
  outcome: z.enum(["accepted", "rejected", "pending"]),
  saleId: protocolId.nullable(),
  at: isoTimestamp,
});
export const apiKey = z.object({
  id: resourceId,
  prefix: z.string(),
  scopes: z.array(z.string()),
  createdAt: isoTimestamp,
  lastUsedAt: isoTimestamp.nullable(),
  revokedAt: isoTimestamp.nullable(),
});
export const requestUsage = z.object({
  at: isoTimestamp,
  method: z.string(),
  path: z.string(),
  status: z.number().int(),
  latencyMs: z.number().nonnegative(),
  requestId: z.string(),
});
export const webhookEndpoint = z.object({
  id: resourceId,
  url: z.url(),
  events: z.array(z.string()),
  enabled: z.boolean(),
  createdAt: isoTimestamp,
});
export const webhookDelivery = z.object({
  id: resourceId,
  endpointId: resourceId,
  eventId: resourceId,
  attempt: z.number().int().positive(),
  status: z.enum(["queued", "sending", "delivered", "failed", "cancelled"]),
  httpStatus: z.number().int().nullable(),
  nextAttemptAt: isoTimestamp.nullable(),
  createdAt: isoTimestamp,
});
export const teamMember = z.object({
  id: resourceId,
  address: addressString,
  role: z.enum(["owner", "admin", "analyst", "viewer"]),
  status: z.enum(["invited", "active", "removed"]),
  joinedAt: isoTimestamp.nullable(),
});
export const auditEntry = z.object({
  id: resourceId,
  actor: z.string(),
  role: z.string(),
  resource: z.string(),
  action: z.string(),
  beforeHash: bytes32String.nullable(),
  afterHash: bytes32String.nullable(),
  at: isoTimestamp,
});
export const subscriptionCampaign = z.object({
  id: resourceId,
  campaignId: protocolId,
  name: z.string(),
  billingPeriod: z.enum(["monthly", "yearly"]),
  subscribers: z.array(
    z.object({
      id: resourceId,
      renewalCount: z.number().int().nonnegative(),
      rewards: uintString,
      cap: uintString,
      nextRenewalAt: isoTimestamp.nullable(),
    }),
  ),
  series: z.array(chartPoint),
});
export const partnership = z.object({
  id: resourceId,
  fromMerchantId: resourceId,
  toMerchantId: resourceId,
  campaignIds: z.array(protocolId),
  terms: z.string(),
  status: z.enum(["proposed", "accepted", "declined", "notice", "withdrawn", "terminated"]),
  versionHistory: z.array(
    z.object({ version: z.number().int().positive(), terms: z.string(), at: isoTimestamp }),
  ),
  performance: countsByState,
});
export const community = z.object({
  id: resourceId,
  owner: addressString,
  name: z.string(),
  description: z.string(),
  campaignIds: z.array(protocolId),
  memberCount: z.number().int().nonnegative(),
  createdAt: isoTimestamp,
});
export const communityMember = z.object({
  address: addressString,
  role: z.enum(["owner", "member"]),
  joinedAt: isoTimestamp,
});
export const credential = z.object({
  id: resourceId,
  issuer: addressString,
  subject: addressString,
  issuedAt: isoTimestamp,
  evidencePeriod: period,
  expiresAt: isoTimestamp,
  metrics: z.object({
    settledConversions: z.number().int().nonnegative(),
    netAttributedValue: uintString,
    merchantCount: z.number().int().nonnegative(),
    campaignCount: z.number().int().nonnegative(),
    refundAdjustment: uintString,
  }),
  evidenceRoot: bytes32String,
  issuerSignature: z.string().regex(/^0x[\da-fA-F]+$/),
  holderSignature: z.string().regex(/^0x[\da-fA-F]+$/),
  status: z.enum(["active", "revoked", "expired"]),
});
export const credentialVerification = z.object({
  valid: z.boolean(),
  checks: z.object({
    issuerSignature: z.boolean(),
    holderSignature: z.boolean(),
    revocation: z.boolean(),
    expiry: z.boolean(),
    evidenceRoot: z.boolean(),
  }),
});
export const fileManifest = z.object({
  schemaVersion: z.string(),
  chainId: z.number().int(),
  fromBlock: uintString,
  toBlock: uintString,
  files: z.array(
    z.object({
      url: z.url(),
      rows: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[\da-f]{64}$/),
    }),
  ),
});
export const supportItem = z.object({
  id: resourceId,
  subject: z.string(),
  category: z.string(),
  status: z.enum(["open", "answered", "resolved", "declined"]),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});
export const riskCase = z.object({
  id: resourceId,
  category: z.string(),
  status: z.enum(["open", "closed"]),
  revision: z.number().int().positive(),
  assignedTo: z.string().nullable(),
  createdAt: isoTimestamp,
});
export const riskCaseDetail = riskCase.extend({
  evidence: z.array(txRef),
  notes: z.array(
    z.object({
      actor: z.string(),
      internalNote: z.string(),
      publicNote: z.string().nullable(),
      at: isoTimestamp,
    }),
  ),
});
export const incident = z.object({
  id: resourceId,
  title: z.string(),
  impact: z.string(),
  severity: z.enum(["degraded", "outage", "maintenance"]),
  startsAt: isoTimestamp,
  endsAt: isoTimestamp.nullable(),
  updatedAt: isoTimestamp,
  updates: z.array(z.object({ message: z.string(), at: isoTimestamp })),
});
export const systemStatus = z.object({
  indexer: z.object({
    name: z.string().nullable(),
    indexedBlock: uintString.nullable(),
    chainHead: uintString,
    chainTime: isoTimestamp,
    lagBlocks: uintString.nullable(),
    lagSeconds: z.number().nonnegative().nullable(),
    state: z.enum(["live", "syncing", "behind", "not_configured"]),
  }),
  reconciliation: reconciliation.nullable(),
  incidents: z.array(incident),
  maintenanceWindow: period.nullable(),
});
export const contractManifest = z.object({
  contracts: z.array(
    z.object({
      name: z.string(),
      address: addressString,
      deployedBlock: uintString,
      deploymentTx: bytes32String.nullable(),
      abiHash: bytes32String,
      sourceVerified: z.boolean(),
      version: z.string(),
    }),
  ),
});
export const endpoint = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string(),
  auth: z.enum(["public", "session", "owner", "merchant", "operator"]),
  inputSchema: z.string(),
  outputSchema: z.string(),
  rateLimit: z.object({
    requests: z.number().int().positive(),
    windowSeconds: z.number().int().positive(),
  }),
  apiVersion: z.literal("v1"),
  availability: z.enum(["live", "designed", "requires_contract"]),
});
export const network = z.object({
  chainId: z.number().int(),
  name: z.string(),
  explorer: z.url().nullable(),
  protocolAddress: addressString.nullable(),
  allowedTokens: z.array(tokenInfo),
  status: z.enum(["live", "not_deployed", "unavailable"]),
});
export const client = z.object({
  name: z.string(),
  maker: z.string(),
  purpose: z.string(),
  type: z.enum(["web", "widget", "sdk", "wallet"]),
  uses: z.array(z.string()),
  protocolVersion: z.string(),
  checks: z.array(z.string()),
  lastCheckedAt: isoTimestamp,
});
export const accessGrant = z.object({
  saleId: protocolId,
  items: z.array(
    z.object({
      id: resourceId,
      url: z.url(),
      expiresAt: isoTimestamp,
      name: z.string().optional(),
      kind: z.enum(["file", "link", "text"]).optional(),
      mimeType: z.string().optional(),
      sizeBytes: z.number().int().nonnegative().optional(),
    }),
  ),
});
export const partnerDetail = z.object({
  partner: partnerRow,
  nodes: z.array(
    z.object({
      nodeId: protocolId,
      parentNodeId: protocolId,
      childCount: z.number().int().nonnegative(),
    }),
  ),
  sales: z.array(
    z.object({
      saleId: protocolId,
      level: z.number().int().positive(),
      amount: uintString,
      state: z.enum(allocationStates),
    }),
  ),
  rewards: sixBuckets,
});
export const reportPreview = z.object({
  counts: z.array(z.object({ kind: z.string(), rows: z.number().int().nonnegative() })),
  reconciliation,
});
export const credentialList = pagedSchema(credential);
