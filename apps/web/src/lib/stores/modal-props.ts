import type { ClientInput, CommissionPolicy, CreditSource } from "@spoke/protocol";
import type { FeatureKey } from "../features";
import type { Persona } from "./mode";
import type { AccountKind } from "./session";

export type SignInReason = "open" | "buy" | "share" | "sell" | "invite";

type SignInProps = {
  reason: SignInReason;
  subject?: string;
  returnTo?: string;
  expectedAddress?: string;
};
type NoProps = Record<string, never>;
type ReportTargetKind = NonNullable<ClientInput<"support.report">["target"]>["kind"];

export type ReportContext = Readonly<Record<string, string | readonly string[]>>;

export type ModalPropsMap = {
  "M-01": SignInProps;
  "M-02": SignInProps;
  "M-03": SignInProps;
  "M-04": {
    mode: "backup" | "check" | "reveal";
    origin: "onboarding" | "settings" | "banner" | "checkout";
    credentialId?: string;
  };
  "M-05": { currentChainId: number; resume?: () => void };
  "M-06": { needSdusdMinor?: string; needMonMinor?: string; context?: string };
  "M-07": NoProps;
  "M-08": { expectedAddress: string; accountKind: AccountKind };
  "M-09": { pendingActionLabel?: string; origin: "engine" | "settings" };
  "M-10": { preselect?: string };
  "M-11": { txId: string } | { view: "list" };
  "M-12": { campaignId: string; parentNodeId?: string; code?: string };
  "M-13": { nodeId: string };
  "M-14": { url: string; title: string };
  "M-15": { campaignId: string; nodeId: string };
  "M-16": { saleId: string };
  "M-17": { campaignId: string; nodeId?: string };
  "M-18": { saleId: string; campaignId: string; nodeId?: string };
  "M-19": { saleId: string };
  "M-20": { saleIds: readonly string[] };
  "M-21":
    | { source: Extract<CreditSource, "REWARD">; token: string }
    | { source: Extract<CreditSource, "SALE_PROCEEDS">; campaignIds: readonly string[] };
  "M-22": { saleId: string; disputeId?: string };
  "M-23": { campaignId: string };
  "M-24": { campaignId: string };
  "M-25": { campaignId: string; mode: "pause" | "resume" };
  "M-26": { campaignId: string };
  "M-27": {
    mode: "edit" | "readOnly";
    policy?: CommissionPolicy;
    onApply?: (policy: CommissionPolicy) => void;
  };
  "M-28": { address: string; campaignId?: string };
  "M-29": { address: string };
  "M-30": {
    kind: "productImage" | "deliverable" | "logo" | "avatar";
    productId?: string;
    onUploaded?: (assetId: string) => void;
  };
  "M-31": { mode: "add" } | { mode: "revoke"; signerId: string };
  "M-32": NoProps;
  "M-33": NoProps;
  "M-34": NoProps;
  "M-35": { scope: "merchant" | "distributor"; kind?: string; campaignId?: string };
  "M-36": NoProps;
  "M-37": NoProps;
  "M-38": { mode: "export" | "delete" };
  "M-39": { query?: string };
  "M-40": NoProps;
  "M-41": {
    category?: string;
    context?: ReportContext;
    target?: { kind: ReportTargetKind; id: string; name: string };
  };
  "M-42": {
    intent: "enter" | "exit" | "reset" | "persona";
    persona?: Persona;
    returnTo?: string;
  };
  "M-43": {
    subject: string;
    onContinue: () => void;
    canSaveDraft?: boolean;
    onSaveDraft?: () => Promise<void>;
  };
  "M-44": { featureKey: FeatureKey; returnTo?: string };
  "M-45": { chainId: number | "demo"; saleId: string };
  "M-46": { invitationId: string };
  "M-47": { provider: "shopify" | "woocommerce" | "stripe" | "custom" };
  "M-48": { caseId: string; action: ClientInput<"ops.act">["action"]["action"] };
};

export type ModalId = keyof ModalPropsMap;

export type ModalEntry = {
  [K in ModalId]: { key: string; id: K; props: ModalPropsMap[K] };
}[ModalId];
