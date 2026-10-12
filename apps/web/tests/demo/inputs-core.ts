import { zeroHash } from "viem";
import { tokens } from "../../src/demo/world/catalog";
import { seedCore } from "../../src/demo/world/seed";
import { ANCHOR } from "./harness";
import type { MethodInputs, MethodPersonas, MethodSetups } from "./inputs-types";

const world = seedCore(ANCHOR);
const person = (id: string) =>
  world.people.find((candidate) => candidate.id === id)?.addresses[0] ?? zeroHash.slice(0, 42);
const buyer = person("demo-buyer-persona");
const buyerSale = (status: string) =>
  world.sales.find((sale) => sale.buyer === buyer && sale.status === status)?.id ?? "demo-s-1";
const png = () =>
  new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "cover.png", { type: "image/png" });

const draftPolicy = {
  rewardToken: tokens.sdusd.address,
  commissionBps: 2200,
  perSaleCap: "10000000",
  campaignLiabilityCap: "300000000",
  maxRewardedAncestors: 3,
  weightsBps: [6000, 2500, 1500],
  shortPathMode: "RENORMALIZE_EXISTING" as const,
  holdSeconds: 86_400,
  expiry: String(Math.floor(Date.parse("2026-11-26T12:00:00.000Z") / 1000)),
  eligibilityHash: zeroHash,
};

export const coreInputs = {
  "campaigns.list": {},
  "campaigns.get": { campaignId: "demo-c-1" },
  "campaigns.policy": { campaignId: "demo-c-6" },
  "campaigns.stats": { campaignId: "demo-c-1" },
  "campaigns.activity": { campaignId: "demo-c-1" },
  "campaigns.mine": {},
  "campaigns.saveDraft": {
    id: "demo-draft-1",
    draft: {
      productId: "demo-p-4",
      policy: draftPolicy,
      endsAt: "2026-11-26T12:00:00.000Z",
      stepReached: 4,
      version: 3,
      mode: "create",
    },
  },
  "campaigns.getDraft": { id: "demo-draft-1" },
  "campaigns.deleteDraft": { id: "demo-draft-1" },
  "campaigns.prepareCreate": { id: "demo-draft-1" },
  "campaigns.updateSettings": { campaignId: "demo-c-1", budgetAlertSales: 8 },
  "campaigns.distributors": { campaignId: "demo-c-1" },
  "products.list": {},
  "products.get": { id: "demo-p-1" },
  "products.save": {
    id: "demo-p-1",
    product: {
      title: "Invoice and proposal template pack",
      summary: "Twelve editable invoice, quote and proposal layouts.",
      description: "Twelve editable invoice, quote and proposal layouts for independent studios.",
      category: "design",
      priceBaseUnits: "42000000",
      token: tokens.sdusd.address,
      fulfillmentMode: "download",
      deliverable: "invoice-pack-v3.zip",
      refundPolicy: "Refunds on request until the settlement hold ends.",
    },
  },
  "products.uploadAsset": { id: "demo-p-1", file: png() },
  "products.categories": {},
  "merchants.get": { slug: "demo-northbeam" },
  "merchants.record": { slug: "demo-northbeam" },
  "merchants.me": {},
  "merchants.setup": {
    name: "Mara's Picks",
    slug: "maras_picks",
    supportEmail: "hello@example.com",
    region: "Stockholm, SE",
    agreementVersion: "1.0",
  },
  "merchants.update": { name: "Northbeam Templates Studio" },
  "merchants.slugAvailable": { slug: "northbeam" },
  "merchants.uploadLogo": { file: png() },
  "merchants.requestVerification": { tier: "domain", domain: "northbeam.example.com" },
  "merchants.close": { confirmation: "close maras_picks", confirmationToken: "a".repeat(64) },
  "merchants.offers": { slug: "demo-northbeam" },
  "links.mine": {},
  "links.get": { nodeId: "demo-n-1-mara" },
  "links.resolveCode": { code: "demo-mara-1" },
  "links.recordOpen": { code: "demo-mara-1" },
  "links.previewJoin": { campaignId: "demo-c-1", parent: "demo-n-1-mara" },
  "links.stats": { nodeId: "demo-n-1-mara" },
  "graph.forCampaign": { campaignId: "demo-c-1", childLimit: 12 },
  "graph.mine": {},
  "graph.ancestry": { nodeId: "demo-n-1-kofi", chainId: 10143 },
  "graph.salePath": { saleId: "demo-s-1", chainId: 10143 },
  "graph.search": { campaignId: "demo-c-1", q: "tomas" },
  "checkout.preview": { campaignId: "demo-c-1", node: "demo-n-1-aiko", buyer },
  "checkout.createIntent": {
    campaignId: "demo-c-4",
    nodeId: "demo-n-4-jonas",
    orderKey: `0x${"1".repeat(64)}`,
    expectedPrice: "25000000",
    expectedReward: "7500000",
    policyHash:
      world.campaigns.find((campaign) => campaign.id === "demo-c-4")?.policies[0]?.hash ?? zeroHash,
    chainId: 10143,
  },
  "checkout.getIntent": { id: "demo-intent-0" },
  "checkout.attachTransaction": { id: "demo-intent-0", txHash: `0x${"2".repeat(64)}` },
  "receipts.get": { saleId: buyerSale("PENDING"), chainId: 10143 },
  "receipts.events": { saleId: "demo-s-40", chainId: 10143 },
  "receipts.verify": { saleId: "demo-s-40", chainId: 10143 },
  "receipts.recent": {},
  "receipts.forBuyer": {},
  "receipts.forMerchant": {},
  "receipts.forCampaign": { campaignId: "demo-c-1" },
  "fulfillment.access": { saleId: buyerSale("FINALIZED") },
  "earnings.summary": {},
  "earnings.byCampaign": {},
  "earnings.byConversion": {},
  "earnings.missed": {},
  "earnings.claimable": {},
  "earnings.claims": {},
  "vault.get": {},
  "vault.movements": { campaignId: "demo-c-1" },
  "reputation.get": { addressOrHandle: "demo-mara" },
  "reputation.mine": {},
  "reputation.updateVisibility": {
    level: "public",
    fields: ["settledConversions", "refundAdjustment"],
    acceptsInvitations: true,
  },
  "distributors.search": {},
  "distributors.get": { address: person("demo-u-1") },
  "distributors.recommendations": {},
  "partners.list": {},
  "partners.get": { address: person("demo-u-2") },
} satisfies MethodInputs;

export const corePersonas = {
  "merchants.setup": "distributor",
  "merchants.close": "distributor",
  "links.mine": "distributor",
  "links.get": "distributor",
  "links.recordOpen": "buyer",
  "links.previewJoin": "buyer",
  "links.stats": "distributor",
  "graph.mine": "distributor",
  "checkout.preview": "buyer",
  "checkout.createIntent": "buyer",
  "checkout.getIntent": "buyer",
  "checkout.attachTransaction": "buyer",
  "receipts.get": "buyer",
  "receipts.forBuyer": "buyer",
  "fulfillment.access": "buyer",
  "earnings.summary": "distributor",
  "earnings.byCampaign": "distributor",
  "earnings.byConversion": "distributor",
  "earnings.missed": "distributor",
  "earnings.claimable": "distributor",
  "earnings.claims": "distributor",
  "reputation.mine": "distributor",
  "reputation.updateVisibility": "distributor",
} satisfies MethodPersonas;

export const coreSetups = {
  "merchants.close": (client) =>
    client["merchants.setup"]({
      name: "Mara's Picks",
      slug: "maras_picks",
      supportEmail: "hello@example.com",
      region: "Stockholm, SE",
      agreementVersion: "1.0",
    }),
} satisfies MethodSetups;
