import type { Address, Hex } from "viem";
import type { CommissionPolicy } from "@spoke/protocol";

export type DemoId = `demo-${string}`;
export type Persona = "merchant" | "distributor" | "buyer";
export type Visibility = "public" | "pseudonymous" | "private";
export type TokenKey = "sdusd" | "sdeur";
export type CampaignStatus = "unfunded" | "active" | "paused" | "ended";
export type TrustMode = "NATIVE_ONCHAIN" | "MERCHANT_ATTESTED" | "THIRD_PARTY_VERIFIED";
export type SaleStatus = "PENDING" | "FINALIZED" | "REFUNDED";

export interface DemoToken {
  key: TokenKey;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  label: string;
}

export interface DemoPerson {
  id: DemoId;
  addresses: Address[];
  handle: string | null;
  displayName: string;
  visibility: Visibility;
  bio: string;
  website: string | null;
  categories: string[];
  joinedAt: number;
  acceptsInvitations: boolean;
  isDistributor: boolean;
}

export interface DemoMerchant {
  id: DemoId;
  slug: string;
  name: string;
  ownerId: DemoId;
  address: Address;
  description: string;
  website: string | null;
  verificationTier: "unverified" | "domain" | "business";
  joinedAt: number;
  region: string;
  supportEmail: string;
  budgetAlertSales: number;
  closedAt: number | null;
  verification: { domain: string; requestedAt: number } | null;
}

export interface DemoDeliverable {
  id: DemoId;
  name: string;
  kind: "pdf" | "zip" | "licence";
}

export interface DemoProduct {
  id: DemoId;
  merchantId: DemoId;
  title: string;
  summary: string;
  outcome: string;
  description: string;
  category: string;
  price: bigint;
  token: TokenKey;
  fulfillmentMode: "download" | "external" | "manual";
  version: number;
  status: "ready" | "draft" | "archived";
  variants: { id: DemoId; name: string; price: bigint }[];
  billingPeriod: "monthly" | "yearly" | null;
  refundPolicy: string;
  deliverables: DemoDeliverable[];
}

export interface DemoPolicyVersion {
  version: number;
  publishedAt: number;
  effectiveAt: number;
  policy: CommissionPolicy;
  hash: Hex;
}

export interface DemoCampaign {
  id: DemoId;
  merchantId: DemoId;
  productId: DemoId;
  token: TokenKey;
  createdAt: number;
  endsAt: number;
  status: CampaignStatus;
  inviteOnly: boolean;
  trustMode: TrustMode;
  kind: "standard" | "subscription" | "external";
  policies: DemoPolicyVersion[];
  budgetAlertSales: number;
  hidden: boolean;
  drill: boolean;
  history: { kind: "activated" | "paused" | "resumed" | "ended"; at: number }[];
}

export interface DemoNode {
  id: DemoId;
  campaignId: DemoId;
  parentId: DemoId | null;
  owner: Address;
  createdAt: number;
  code: string;
  moderation: "visible" | "hidden" | "flagged";
  moderationReason: string | null;
  visits: number;
}

export interface DemoAllocation {
  nodeId: DemoId;
  owner: Address;
  level: number;
  weightBps: number;
  amount: bigint;
  claimId: DemoId | null;
}

export interface DemoSale {
  id: DemoId;
  campaignId: DemoId;
  nodeId: DemoId | null;
  buyer: Address;
  orderKey: Hex;
  policyVersion: number;
  price: bigint;
  reward: bigint;
  unallocated: bigint;
  allocations: DemoAllocation[];
  purchasedAt: number;
  unlockAt: number;
  status: SaleStatus;
  finalizedAt: number | null;
  refundedAt: number | null;
  proceedsClaimId: DemoId | null;
  source: "native" | "merchant_attested";
  reversed: boolean;
}

export interface DemoClaim {
  id: DemoId;
  claimant: Address;
  token: TokenKey;
  amount: bigint;
  at: number;
  source: "REWARD" | "SALE_PROCEEDS";
  campaignId: DemoId | null;
}

export interface DemoFunding {
  id: DemoId;
  campaignId: DemoId;
  kind: "deposited" | "withdrawn";
  amount: bigint;
  at: number;
}

export interface DemoCore {
  anchor: number;
  tokens: Record<TokenKey, DemoToken>;
  people: DemoPerson[];
  merchants: DemoMerchant[];
  products: DemoProduct[];
  campaigns: DemoCampaign[];
  nodes: DemoNode[];
  sales: DemoSale[];
  claims: DemoClaim[];
  fundings: DemoFunding[];
  personas: Record<Persona, DemoId>;
  operatorId: DemoId;
}
