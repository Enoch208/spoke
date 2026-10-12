import type { ClientMethod, ClientOutput } from "@spoke/protocol";
import type { Address } from "viem";
import type { DemoCore, DemoId } from "./types";

type Item<M extends ClientMethod> = ClientOutput<M> extends readonly (infer T)[] ? T : never;

export type Passkey = Item<"account.passkeys">;
export type LinkedWallet = Item<"account.wallets">;
export type DeviceSession = Item<"account.sessions">;
export type SupportItem = Item<"support.mine">;
export type PolicyTemplate = Item<"studio.templates">;
export type Integration = Item<"integrations.list">;
export type ApiKey = Item<"apiKeys.list">;
export type WebhookEndpoint = Item<"webhooks.list">;
export type TeamMember = Item<"team.members">;
export type ThirdPartyClient = Item<"clients.list">;
export type Network = Item<"networks.list">;
export type Reconciliation = Item<"ops.reconciliation">;
export type Credential = Item<"reputation.credentials">;
export type Notification = ClientOutput<"notifications.list">["items"][number];
export type ExportJob = ClientOutput<"account.exportData">;
export type Preferences = ClientOutput<"account.preferences">;
export type NotificationPreferences = ClientOutput<"notifications.preferences">;
export type CampaignDraft = ClientOutput<"campaigns.getDraft">;
export type CheckoutIntent = ClientOutput<"checkout.getIntent">;
export type Invitation = ClientOutput<"invitations.send">;
export type Dispute = ClientOutput<"disputes.get">;
export type ReportRun = ClientOutput<"reports.list">["items"][number];
export type IntegrationStatus = ClientOutput<"integrations.status">;
export type OrderSigner = ClientOutput<"signers.revoke">;
export type Attestation = ClientOutput<"signers.attestations">["items"][number];
export type RequestUsage = ClientOutput<"apiKeys.usage">["requests"][number];
export type WebhookDelivery = ClientOutput<"webhooks.test">;
export type AuditEntry = ClientOutput<"team.audit">["items"][number];
export type SubscriptionCampaign = ClientOutput<"subscriptions.get">;
export type Partnership = ClientOutput<"partnerships.respond">;
export type Community = ClientOutput<"communities.get">;
export type CommunityMember = ClientOutput<"communities.join">;
export type DistributorInsights = ClientOutput<"insights.forDistributor">;
export type RiskCaseDetail = ClientOutput<"ops.case">;
export type Incident = ClientOutput<"ops.incident">;
export type Asset = ClientOutput<"products.uploadAsset">;
export type GasState = ClientOutput<"funding.status">["gas"];
export type ActivityRow = ClientOutput<"account.activity">["items"][number];

export interface DemoProfile {
  handle: string | null;
  displayName: string;
  avatarSeed: string;
  bio: string;
  website: string | null;
  intent: "buy" | "earn" | "sell" | null;
  onboardingCompletedAt: number | null;
  recoveryCheckedAt: number | null;
  handleChangedAt: number | null;
  payoutAddress: Address;
  accountKind: "passkey" | "wallet" | "phrase";
  createdAt: number;
  isOperator: boolean;
  shownFields: string[];
}

export interface DemoAccount {
  personId: DemoId;
  profile: DemoProfile;
  passkeys: Passkey[];
  wallets: LinkedWallet[];
  sessions: DeviceSession[];
  preferences: Preferences;
  notificationPreferences: NotificationPreferences;
  notifications: Notification[];
  support: SupportItem[];
  exports: ExportJob[];
  gas: GasState;
  activity: ActivityRow[];
}

export interface DemoBalance {
  mon: bigint;
  sdusd: bigint;
  sdeur: bigint;
  allowance: bigint;
}

export interface DemoDraftRecord {
  merchantId: DemoId;
  draft: CampaignDraft;
  launchedCampaignId: DemoId | null;
}

export interface DemoOpsCase {
  detail: RiskCaseDetail;
  severity: "low" | "medium" | "high";
  subject: string;
}

export interface BlockedCheckout {
  campaignId: DemoId;
  nodeId: DemoId;
  reason: "SELF_REFERRAL" | "INVALID_BUYER" | "DEPLETED_POOL" | "CAMPAIGN_INACTIVE";
  at: number;
}

export interface DemoWorld extends DemoCore {
  accounts: Record<DemoId, DemoAccount>;
  balances: Record<Address, DemoBalance>;
  drafts: DemoDraftRecord[];
  intents: CheckoutIntent[];
  invitations: Invitation[];
  templates: (PolicyTemplate & { merchantId: DemoId })[];
  reports: ReportRun[];
  disputes: Dispute[];
  integrations: Integration[];
  integrationStatus: Record<string, IntegrationStatus>;
  signers: OrderSigner[];
  attestations: (Attestation & { signerId: string })[];
  apiKeys: ApiKey[];
  apiUsage: RequestUsage[];
  webhooks: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
  team: TeamMember[];
  audit: AuditEntry[];
  subscriptions: SubscriptionCampaign[];
  partnerships: Partnership[];
  communities: Community[];
  communityMembers: Record<string, CommunityMember[]>;
  credentials: Credential[];
  insights: Record<Address, DistributorInsights>;
  opsCases: DemoOpsCase[];
  moderation: SupportItem[];
  opsAudit: AuditEntry[];
  reconciliations: Reconciliation[];
  incidents: Incident[];
  clients: ThirdPartyClient[];
  networks: Network[];
  assets: { productId: DemoId; asset: Asset }[];
  blockedCheckouts: BlockedCheckout[];
  counters: Record<string, number>;
  lastChainActionAt: number | null;
}
