import { z } from "zod";
import * as m from "./models";
import * as p from "./platform";
import * as a from "./aurora";
import * as i from "../api-v3";
import { addressString, bytes32String, health, isoTimestamp, uintString } from "./common";
import { commissionPolicy } from "../policy";

const empty = z.strictObject({});
const id = z.object({ id: i.resourceId });
const campaign = z.object({ campaignId: m.protocolId });
const node = z.object({ nodeId: m.protocolId });
const sale = z.object({ saleId: m.protocolId, chainId: z.number().int() });
const address = z.object({ address: addressString });
const pagination = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
const tokenFilter = z.object({ token: addressString.optional() });
const range = z.object({
  range: p.period.optional(),
  campaignIds: z.array(m.protocolId).optional(),
});
const credentialsInput = z.object({ credential: p.credential });
const stepUp = z.object({ confirmationToken: z.string().min(32).max(128) });
export const opaqueVault = z
  .record(z.string(), z.json())
  .refine((value) => JSON.stringify(value).length <= 32768, "Vault exceeds 32 KiB.");
export const campaignFilters = pagination.extend({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  rateMin: z.number().int().min(1).max(10000).optional(),
  rateMax: z.number().int().min(1).max(10000).optional(),
  levels: z.number().int().min(1).max(5).optional(),
  holdMax: z.number().int().nonnegative().optional(),
  budgetLeftMin: uintString.optional(),
  source: z.enum(["NATIVE_ONCHAIN", "MERCHANT_ATTESTED", "THIRD_PARTY_VERIFIED"]).optional(),
  invitationOnly: z.boolean().optional(),
  excludeJoined: z.boolean().optional(),
  status: z.enum(["active", "not_live", "paused", "ended", "expired"]).optional(),
  merchant: z.string().optional(),
  sort: z.enum(["balanced", "newest", "reward", "budget", "hold"]).optional(),
});
export const saleFilters = pagination.extend(range.shape).extend({
  q: z.string().max(200).optional(),
  state: z.enum(["PENDING", "FINALIZED", "REFUNDED"]).optional(),
  campaignId: m.protocolId.optional(),
  source: z.enum(["NATIVE_ONCHAIN", "MERCHANT_ATTESTED"]).optional(),
  provider: z.string().optional(),
  unlockBefore: isoTimestamp.optional(),
});
export const merchantCampaignFilters = campaignFilters.extend({
  status: z.enum(["active", "not_live", "paused", "ended", "expired", "draft"]).optional(),
  eligibility: z.string().optional(),
});
export const distributorFilters = pagination.extend({
  q: z.string().max(200).optional(),
  categories: z.array(z.string()).optional(),
  minSettledSales: z.number().int().nonnegative().optional(),
  merchantDiversity: z.number().int().nonnegative().optional(),
  recency: z.number().int().positive().optional(),
  sort: z.enum(["balanced", "settled", "diversity", "recent", "new"]).optional(),
});
export const caseAction = z.object({
  action: z.enum([
    "addNote",
    "assign",
    "close",
    "reopen",
    "openCase",
    "dismissReport",
    "acknowledgeAlert",
    "requestInformation",
    "hideFromDiscovery",
    "addPublicNotice",
    "freezeNewActivity",
    "askMerchantToPause",
    "restore",
    "liftFreeze",
  ]),
  revision: z.number().int().positive(),
  reasonCategory: z.string(),
  internalNote: z.string().min(20).max(1000),
  publicNote: z.string().max(280).optional(),
  assignee: z.string().optional(),
});
export const reportRequest = range.extend({
  kind: z.enum(["sales", "vault", "distributorEarnings", "partners", "analytics"]),
  filters: saleFilters.optional(),
  format: z.enum(["csv", "json"]),
});
export const campaignDraftRequest = i.campaignDraftInput;
const method = <I extends z.ZodType, O extends z.ZodType>(input: I, output: O) => ({
  input,
  output,
  release: "core" as const,
});
const preview = <I extends z.ZodType, O extends z.ZodType>(input: I, output: O) => ({
  input,
  output,
  release: "demo-only" as const,
});
const visibility = i.visibilityInput;
const graphFilter = pagination.extend({
  rootNode: m.protocolId.optional(),
  depth: z.number().int().min(1).max(16).optional(),
  childLimit: z.number().int().min(1).max(100).optional(),
});
const earningsFilter = pagination.extend(range.shape).extend({
  campaignId: m.protocolId.optional(),
  nodeId: m.protocolId.optional(),
  state: z.enum(["reserved", "claimable", "claimed", "refunded", "reversed"]).optional(),
  holdEnded: z.boolean().optional(),
});
const timeline = pagination.extend({ kinds: z.array(z.string()).optional() });
const webhookInput = z.object({ url: i.publicUrl, events: z.array(z.string()).min(1).max(50) });
const credentialId = z.object({ credentialId: z.string().min(16).max(1024) });

export const clientMethodSchemas = {
  "auth.challenge": method(i.challengeInput, m.authChallenge),
  "auth.verify": method(
    i.verifyInput,
    z.union([
      m.session,
      m.confirmation,
      z.object({ address: addressString, isNewAccount: z.literal(true), session: z.null() }),
    ]),
  ),
  "auth.signOut": method(empty, m.okSchema),
  "account.me": method(empty, m.me),
  "account.updateProfile": method(i.profileUpdate, m.me),
  "account.handleAvailable": method(z.object({ handle: z.string() }), m.handleAvailability),
  "account.activity": method(
    pagination.extend({ address: addressString.optional(), filter: z.string().optional() }),
    m.pagedSchema(m.activityRow),
  ),
  "account.balances": method(address.partial(), m.balances),
  "account.recordRecoveryCheck": method(empty, z.object({ checkedAt: isoTimestamp })),
  "account.passkeys": method(empty, z.array(m.passkey)),
  "account.addPasskey": method(
    credentialId.extend({
      kind: z.enum(["original", "added"]),
      transports: z.array(z.enum(["usb", "nfc", "ble", "internal", "hybrid", "smart-card"])),
      label: z.string().min(1).max(80),
      vault: opaqueVault.optional(),
      confirmationToken: z.string().optional(),
    }),
    m.passkey,
  ),
  "account.updatePasskey": method(
    credentialId.extend({ label: z.string().min(1).max(80) }),
    m.passkey,
  ),
  "account.removePasskey": method(credentialId.extend(stepUp.shape), m.okSchema),
  "account.passkeyVault": method(credentialId, opaqueVault),
  "account.wallets": method(empty, z.array(m.linkedWallet)),
  "account.linkWallet": method(
    address.extend(stepUp.shape).extend({
      kind: i.accountKind,
      derivationIndex: z.number().int().min(0).max(4).optional(),
      walletName: z.string().max(80).optional(),
      label: z.string().max(80).optional(),
      linkSignature: z.string().regex(/^0x[\da-fA-F]+$/),
      nonce: z.string(),
    }),
    m.linkedWallet,
  ),
  "account.unlinkWallet": method(address.extend(stepUp.shape), m.okSchema),
  "account.labelWallet": method(address.extend({ label: z.string().max(80) }), m.linkedWallet),
  "account.setPayoutAddress": method(address.extend(stepUp.shape), m.linkedWallet),
  "account.sessions": method(empty, z.array(m.deviceSession)),
  "account.revokeSession": method(
    z.union([
      z.object({ sessionId: i.resourceId }),
      z.object({ scope: z.enum(["others", "all"]) }),
    ]),
    m.okSchema,
  ),
  "account.preferences": method(empty, m.preferences),
  "account.updatePreferences": method(i.preferencesUpdate, m.preferences),
  "account.exportData": method(stepUp, m.exportJob),
  "account.deleteAccount": method(
    stepUp.extend({ typedConfirmation: z.literal("delete my account") }),
    m.okSchema,
  ),
  "funding.status": method(address.partial(), m.fundingStatus),
  "funding.requestGas": method(empty, m.gasDrip),
  "funding.auroraConfig": method(empty, a.auroraConfig),
  "funding.auroraPreview": method(a.auroraQuoteInput, a.auroraQuote),
  "funding.auroraCreateDeposit": method(a.auroraCreateInput, a.auroraDeposit),
  "funding.auroraDeposit": method(z.object({ id: z.uuid() }), a.auroraDeposit),
  "notifications.list": method(
    pagination.extend({ unreadOnly: z.boolean().optional(), category: z.string().optional() }),
    m.pagedSchema(m.notification),
  ),
  "notifications.markRead": method(
    z.union([
      z.object({ ids: z.array(i.resourceId).min(1).max(100) }),
      z.object({ all: z.literal(true) }),
    ]),
    m.okSchema,
  ),
  "notifications.preferences": method(empty, i.notificationPreferences),
  "notifications.updatePreferences": method(
    i.notificationPreferences.partial(),
    i.notificationPreferences,
  ),
  "campaigns.list": method(
    campaignFilters,
    m.pagedSchema(m.campaignCard).extend({ total: z.number().int().nonnegative() }),
  ),
  "campaigns.get": method(campaign, m.campaignDetail),
  "campaigns.policy": method(campaign, m.campaignPolicy),
  "campaigns.stats": method(campaign, m.campaignStats),
  "campaigns.activity": method(campaign.extend(timeline.shape), p.networkActivity),
  "campaigns.mine": method(
    merchantCampaignFilters,
    m
      .pagedSchema(p.merchantCampaignRow)
      .extend({ countsByState: z.record(z.string(), z.number().int().nonnegative()) }),
  ),
  "campaigns.saveDraft": method(id.extend({ draft: campaignDraftRequest }), m.campaignDraft),
  "campaigns.getDraft": method(id, m.campaignDraft),
  "campaigns.deleteDraft": method(id, z.object({ deleted: z.literal(true) })),
  "campaigns.prepareCreate": method(id, m.preparedCampaign),
  "campaigns.updateSettings": method(
    campaign.extend({ budgetAlertSales: z.number().int().min(1).max(50) }),
    z.object({ budgetAlertSales: z.number().int().min(1).max(50) }),
  ),
  "campaigns.distributors": method(
    campaign.extend(pagination.shape).extend({ sort: z.string().optional() }),
    m.pagedSchema(p.campaignDistributorRow),
  ),
  "products.list": method(
    pagination.extend({ billing: z.enum(["oneTime", "subscription"]).optional() }),
    m.pagedSchema(m.product),
  ),
  "products.get": method(id, m.product),
  "products.save": method(id.extend({ product: i.productInput }), m.product),
  "products.uploadAsset": method(id.extend({ file: z.file().max(25_000_000) }), m.asset),
  "products.categories": method(empty, z.array(z.object({ id: z.string(), name: z.string() }))),
  "merchants.get": method(z.object({ slug: z.string() }), m.merchantProfile),
  "merchants.record": method(z.object({ slug: z.string() }), p.merchantRecord),
  "merchants.me": method(empty, m.merchantOrg),
  "merchants.setup": method(i.merchantInput, m.merchantOrg),
  "merchants.update": method(i.merchantUpdate, m.merchantOrg),
  "merchants.slugAvailable": method(
    z.object({ slug: z.string() }),
    z.object({
      available: z.boolean(),
      reason: z.enum(["taken", "reserved", "invalid"]).nullable(),
      suggestion: z.string().nullable(),
    }),
  ),
  "merchants.uploadLogo": method(
    z.object({ file: z.file().max(2_000_000).mime(["image/png", "image/jpeg", "image/webp"]) }),
    m.asset.pick({ url: true, width: true, height: true, sha256: true }),
  ),
  "merchants.requestVerification": preview(
    z.object({ tier: z.literal("domain"), domain: z.string() }),
    z.object({
      status: z.enum(["pending", "verified", "failed"]),
      record: z.object({ type: z.literal("TXT"), name: z.string(), value: z.string() }),
    }),
  ),
  "merchants.close": method(stepUp.extend({ confirmation: z.string() }), m.okSchema),
  "merchants.offers": method(
    z.object({ slug: z.string() }).extend(pagination.shape),
    m.pagedSchema(m.campaignCard),
  ),
  "links.mine": method(pagination, m.pagedSchema(m.linkRow)),
  "links.get": method(node, z.union([m.publicLinkRow, m.linkRow])),
  "links.resolveCode": method(z.object({ code: z.string() }), m.referralResolution),
  "links.recordOpen": method(z.object({ code: z.string() }), m.okSchema),
  "links.previewJoin": method(campaign.extend({ parent: m.protocolId.optional() }), m.joinPreview),
  "links.stats": method(node, m.linkStats),
  "graph.forCampaign": method(campaign.extend(graphFilter.shape), m.graphSlice),
  "graph.mine": method(graphFilter, m.graphSlice),
  "graph.ancestry": method(
    node.extend({ chainId: z.number().int() }),
    z.object({ nodes: z.array(m.graphNode), truncated: z.boolean() }),
  ),
  "graph.salePath": method(
    sale,
    z.object({
      saleId: m.protocolId,
      nodes: z.array(m.pathEntry),
      policyHash: bytes32String,
      evidence: z.array(m.txRef),
      truncated: z.boolean(),
    }),
  ),
  "graph.search": method(campaign.extend({ q: z.string().min(1).max(100) }), z.array(m.graphNode)),
  "graph.export": preview(
    z.object({
      scope: z.enum(["campaign", "mine"]),
      campaignId: m.protocolId.optional(),
      depth: z.number().int().min(1).max(256),
      saleStates: z.array(z.enum(["PENDING", "FINALIZED", "REFUNDED"])),
      period: p.period,
      format: z.enum(["csv", "json"]),
    }),
    p.fileManifest,
  ),
  "checkout.preview": method(
    campaign.extend({ node: m.protocolId.optional(), buyer: addressString.optional() }),
    m.checkoutPreview,
  ),
  "checkout.createIntent": method(
    i.checkoutInputV3.extend({ campaignId: m.protocolId, nodeId: m.protocolId.default("0") }),
    m.checkoutIntent,
  ),
  "checkout.getIntent": method(id, m.checkoutIntent),
  "checkout.attachTransaction": method(id.extend({ txHash: bytes32String }), m.checkoutIntent),
  "receipts.get": method(sale, m.saleReceipt),
  "receipts.events": method(sale, z.array(m.proofEvent)),
  "receipts.verify": method(
    sale,
    z.object({
      sale: m.saleReceipt,
      allocations: z.array(m.saleAllocation),
      policyHash: bytes32String,
      blockNumber: uintString,
      matchesIndex: z.boolean(),
    }),
  ),
  "receipts.recent": method(saleFilters, m.pagedSchema(m.saleReceipt)),
  "receipts.forBuyer": method(
    saleFilters.extend({ since: isoTimestamp.optional() }),
    m.pagedSchema(p.purchaseRow),
  ),
  "receipts.forMerchant": method(
    saleFilters,
    m.pagedSchema(p.saleRow).extend({ countsByState: m.countsByState }),
  ),
  "receipts.forCampaign": method(
    campaign.extend(saleFilters.shape),
    m.pagedSchema(p.saleRow.omit({ orderKey: true })),
  ),
  "fulfillment.access": method(z.object({ saleId: m.protocolId }), p.accessGrant),
  "earnings.summary": method(tokenFilter, m.earningsSummary),
  "earnings.byCampaign": method(earningsFilter, z.array(m.campaignEarnings)),
  "earnings.byConversion": method(earningsFilter, m.pagedSchema(m.conversionEarning)),
  "earnings.missed": method(earningsFilter, m.pagedSchema(p.missedEarning)),
  "earnings.claimable": method(tokenFilter, m.claimable),
  "earnings.claims": method(pagination, m.pagedSchema(p.claimRow)),
  "vault.get": method(campaign.partial().extend(tokenFilter.shape), m.vaultLedger),
  "vault.movements": method(
    campaign.partial().extend(pagination.shape).extend({ kind: z.string().optional() }),
    m.pagedSchema(p.vaultMovement),
  ),
  "reputation.get": method(
    z.object({ addressOrHandle: z.string(), groupBy: z.enum(["merchant", "campaign"]).optional() }),
    z.union([
      m.publicReputationProfile,
      m.reputationProfile,
      z.object({ hidden: z.literal(true) }),
    ]),
  ),
  "reputation.mine": method(empty, m.reputationProfile),
  "reputation.updateVisibility": method(visibility, visibility),
  "reputation.exportCredential": preview(empty, p.credential),
  "reputation.credentials": preview(empty, z.array(p.credential)),
  "reputation.revokeCredential": preview(id, p.credential),
  "reputation.verifyCredential": preview(credentialsInput, p.credentialVerification),
  "distributors.search": method(
    distributorFilters,
    m.pagedSchema(p.distributorCard).extend({ newDistributors: z.array(p.distributorCard) }),
  ),
  "distributors.get": method(address, p.distributorCard),
  "distributors.recommendations": preview(
    empty,
    z.array(p.distributorCard.extend({ reasons: z.array(z.string()) })),
  ),
  "partners.list": method(
    campaign.partial().extend(pagination.shape).extend({
      status: z.string().optional(),
      q: z.string().optional(),
      sort: z.string().optional(),
    }),
    m.pagedSchema(p.partnerRow).extend({
      summary: z.object({
        partners: z.number().int().nonnegative(),
        sales: m.countsByState,
        value: uintString,
        series: z.array(p.chartPoint),
      }),
    }),
  ),
  "partners.get": method(address, p.partnerDetail),
  "invitations.get": method(id, p.invitation),
  "invitations.mine": method(
    pagination.extend({ status: z.string().optional() }),
    m.pagedSchema(p.invitation),
  ),
  "invitations.sent": method(
    pagination.extend({ distributor: addressString.optional() }),
    m.pagedSchema(p.invitation),
  ),
  "invitations.send": method(i.invitationInput.extend({ campaignId: m.protocolId }), p.invitation),
  "invitations.respond": method(
    id.extend({ response: z.enum(["accept", "decline"]), reason: z.string().max(500).optional() }),
    p.invitation,
  ),
  "invitations.withdraw": method(id, p.invitation),
  "insights.forDistributor": method(address, p.distributorInsights),
  "analytics.merchant": method(
    range.extend({
      source: z.string().optional(),
      basis: z.string().optional(),
      compare: z.boolean().optional(),
    }),
    p.merchantAnalytics,
  ),
  "analytics.campaign": method(campaign.extend(range.shape), p.merchantAnalytics),
  "reports.export": method(reportRequest, z.union([z.object({ url: z.url() }), m.exportJob])),
  "reports.preview": method(range, p.reportPreview),
  "reports.list": method(pagination, m.pagedSchema(p.reportRun)),
  "studio.templates": method(empty, z.array(p.policyTemplate)),
  "studio.saveTemplate": method(
    z.object({ name: z.string().min(2).max(100), policy: commissionPolicy }),
    p.policyTemplate,
  ),
  "studio.simulate": method(
    z.object({
      price: uintString,
      policy: commissionPolicy,
      pathLengths: z.array(z.number().int().min(0).max(256)).min(1).max(20),
    }),
    p.simulationResult,
  ),
  "disputes.open": method(
    z.object({
      saleId: m.protocolId,
      reason: z.string().min(3).max(100),
      message: z.string().min(20).max(3000),
    }),
    z.object({ disputeId: i.resourceId, status: z.literal("open") }),
  ),
  "disputes.list": method(
    pagination.extend({
      kind: z
        .enum(["refund_request", "attribution_appeal", "moderation_appeal", "chargeback"])
        .optional(),
      status: z.string().optional(),
    }),
    m.pagedSchema(p.dispute),
  ),
  "disputes.get": method(id, p.dispute),
  "disputes.respond": method(
    id.extend({
      outcome: z.enum(["refunded", "declined", "explained", "escalated", "appealed", "covered"]),
      message: z.string().min(10).max(3000),
    }),
    p.dispute,
  ),
  "disputes.exposure": method(
    empty,
    z.object({
      openRefundRequests: z.number().int().nonnegative(),
      refundValue: uintString,
      appeals: z.number().int().nonnegative(),
      chargebacks: z.number().int().nonnegative(),
      riskDebt: uintString,
    }),
  ),
  "billing.summary": method(empty, p.billingSummary),
  "billing.invoices": method(pagination, m.pagedSchema(p.invoice)),
  "integrations.list": preview(empty, z.array(p.integration)),
  "integrations.connect": preview(
    z.object({
      provider: z.enum(["shopify", "stripe", "woocommerce"]),
      storeUrl: i.publicUrl.optional(),
      authorizationCode: z.string().optional(),
    }),
    p.integration,
  ),
  "integrations.disconnect": preview(z.object({ provider: z.string() }), m.okSchema),
  "integrations.status": preview(
    z.object({ provider: z.string(), refresh: z.boolean().optional() }),
    p.integrationStatus,
  ),
  "integrations.reconciliation": preview(
    z.object({ provider: z.string() }).extend(range.shape),
    p.integrationStatus,
  ),
  "integrations.resolveMismatch": preview(
    id.extend({ note: z.string().min(20).max(1000) }),
    p.auditEntry,
  ),
  "signers.list": preview(
    empty,
    z.object({
      items: z.array(p.orderSigner),
      policy: z.object({
        domain: z.object({
          name: z.string(),
          version: z.string(),
          chainId: z.number().int(),
          verifyingContract: addressString,
        }),
        nonceRule: z.string(),
        maxValiditySeconds: z.literal(900),
      }),
    }),
  ),
  "signers.add": preview(
    p.orderSigner.omit({ id: true, revokedAt: true, usedToday: true }),
    p.orderSigner,
  ),
  "signers.revoke": preview(id, p.orderSigner),
  "signers.attestations": preview(
    id
      .extend(pagination.shape)
      .extend({ outcome: z.string().optional(), nonce: uintString.optional() }),
    m.pagedSchema(p.attestation),
  ),
  "apiKeys.list": preview(empty, z.array(p.apiKey)),
  "apiKeys.create": preview(
    stepUp.extend({ name: z.string().min(1).max(80), scopes: z.array(z.string()).min(1) }),
    p.apiKey.extend({ secret: z.string() }),
  ),
  "apiKeys.revoke": preview(id, m.okSchema),
  "apiKeys.usage": preview(
    id.extend(range.shape),
    z.object({
      hourly: z.array(
        z.object({
          at: isoTimestamp,
          statusClass: z.string(),
          count: z.number().int().nonnegative(),
        }),
      ),
      requests: z.array(p.requestUsage).max(50),
    }),
  ),
  "webhooks.list": preview(empty, z.array(p.webhookEndpoint)),
  "webhooks.create": preview(webhookInput, p.webhookEndpoint.extend({ secret: z.string() })),
  "webhooks.test": preview(id, p.webhookDelivery),
  "webhooks.deliveries": preview(id.extend(pagination.shape), m.pagedSchema(p.webhookDelivery)),
  "webhooks.update": preview(
    id.extend({ events: z.array(z.string()).optional(), enabled: z.boolean().optional() }),
    p.webhookEndpoint,
  ),
  "webhooks.rotateSecret": preview(
    id,
    z.object({ secret: z.string(), oldSecretExpiresAt: isoTimestamp }),
  ),
  "webhooks.remove": preview(id, m.okSchema),
  "webhooks.replay": preview(id, p.webhookDelivery),
  "team.members": preview(empty, z.array(p.teamMember)),
  "team.invite": preview(
    address.extend({ role: z.enum(["admin", "analyst", "viewer"]) }),
    p.teamMember,
  ),
  "team.updateRole": preview(
    id.extend({ role: z.enum(["admin", "analyst", "viewer"]) }),
    p.teamMember,
  ),
  "team.remove": preview(id, m.okSchema),
  "team.audit": preview(pagination, m.pagedSchema(p.auditEntry)),
  "team.transferOwnership": preview(address.extend(stepUp.shape), m.okSchema),
  "subscriptions.list": preview(pagination, m.pagedSchema(p.subscriptionCampaign)),
  "subscriptions.get": preview(id, p.subscriptionCampaign),
  "subscriptions.save": preview(
    id.extend({
      campaignId: m.protocolId,
      name: z.string(),
      billingPeriod: z.enum(["monthly", "yearly"]),
    }),
    p.subscriptionCampaign,
  ),
  "partnerships.list": preview(pagination, m.pagedSchema(p.partnership)),
  "partnerships.propose": preview(
    z.object({ toMerchantId: i.resourceId, campaignIds: z.array(m.protocolId), terms: z.string() }),
    p.partnership,
  ),
  "partnerships.respond": preview(
    id.extend({ response: z.enum(["accept", "decline"]), reason: z.string().optional() }),
    p.partnership,
  ),
  "partnerships.terminate": preview(
    id.extend({ mode: z.enum(["notice", "withdraw"]) }),
    p.partnership,
  ),
  "communities.list": preview(pagination, m.pagedSchema(p.community)),
  "communities.get": preview(id, p.community),
  "communities.create": preview(
    z.object({ name: z.string(), description: z.string(), campaignIds: z.array(m.protocolId) }),
    p.community,
  ),
  "communities.members": preview(id.extend(pagination.shape), m.pagedSchema(p.communityMember)),
  "communities.join": preview(id.extend({ inviteCode: z.string() }), p.communityMember),
  "communities.leave": preview(id, m.okSchema),
  "communities.update": preview(
    id.extend({
      name: z.string().optional(),
      description: z.string().optional(),
      campaignIds: z.array(m.protocolId).optional(),
      removeMember: addressString.optional(),
      regenerateInvite: z.boolean().optional(),
    }),
    p.community,
  ),
  "networks.list": method(empty, z.array(p.network)),
  "tokens.list": method(
    empty,
    z.array(m.tokenInfo.extend({ role: z.enum(["payment", "reward", "both"]), label: z.string() })),
  ),
  "support.report": method(i.supportInput, z.object({ ticketId: i.resourceId })),
  "support.contact": method(
    z.object({
      subject: z.string().min(3).max(150),
      message: z.string().min(20).max(5000),
      email: z.email(),
    }),
    z.object({ ticketId: i.resourceId }),
  ),
  "support.mine": method(empty, z.array(p.supportItem)),
  "system.health": method(empty, health),
  "system.status": method(empty, p.systemStatus),
  "system.contracts": method(empty, p.contractManifest),
  "system.endpoints": method(empty, z.array(p.endpoint)),
  "system.events": method(
    z.object({ name: z.string().optional(), limit: z.number().int().min(1).max(100).optional() }),
    z.array(m.proofEvent),
  ),
  "playground.run": method(
    z.object({ path: z.string().min(4).max(2048) }),
    z.object({
      status: z.number().int(),
      headers: z.record(z.string(), z.string()),
      body: z.string(),
      durationMs: z.number().nonnegative(),
      size: z.number().int().nonnegative(),
    }),
  ),
  "clients.list": preview(empty, z.array(p.client)),
  "ops.queue": method(pagination, m.pagedSchema(p.riskCase)),
  "ops.case": method(id, p.riskCaseDetail),
  "ops.act": method(id.extend({ action: caseAction }), p.riskCaseDetail),
  "ops.moderation": method(pagination, m.pagedSchema(p.supportItem)),
  "ops.audit": method(pagination, m.pagedSchema(p.auditEntry)),
  "ops.reconciliation": method(empty, z.array(p.reconciliation)),
  "ops.runReconciliation": method(empty, z.object({ runId: i.resourceId })),
  "ops.incident": method(
    z.object({
      id: i.resourceId.optional(),
      title: z.string().min(5).max(150),
      impact: z.string().min(10).max(1000),
      severity: z.enum(["degraded", "outage", "maintenance"]),
      publicMessage: z.string().min(10).max(2000),
      status: z.enum(["open", "resolved"]),
    }),
    p.incident,
  ),
} as const;

export type ClientMethod = keyof typeof clientMethodSchemas;
export type ClientInput<M extends ClientMethod> = z.input<(typeof clientMethodSchemas)[M]["input"]>;
export type ClientOutput<M extends ClientMethod> = z.output<
  (typeof clientMethodSchemas)[M]["output"]
>;
export type ClientContract = {
  [M in ClientMethod]: (input: ClientInput<M>) => Promise<ClientOutput<M>>;
};
