import type { CommissionPolicy, TxState } from "@spoke/protocol";
import type { ClientErrorCode } from "@/lib/client/errors";
import type { InvalidationTarget } from "@/lib/query/keys";
import type { Mode } from "@/lib/stores/mode";

export type Hex = `0x${string}`;

export type TxParamsMap = {
  createCampaign: {
    draftId: string;
    campaignName: string;
    metadataHash: Hex;
    skuHash: Hex;
    skuPrice: string;
    policy: CommissionPolicy;
    deposit: string;
  };
  fundCampaign: { campaignId: string; campaignName: string; amount: string };
  createNode: { campaignId: string; campaignName: string; parentNodeId: string; metadataHash: Hex };
  purchase: {
    campaignId: string;
    nodeId: string;
    orderKey: Hex;
    price: string;
    productTitle: string;
    merchantName: string;
    intentId: string | null;
  };
  refund: { saleId: string; price: string };
  finalize: { saleId: string };
  claimRewards: { token: Hex; finalizeSaleIds: readonly string[] };
  claimProceeds: { campaignIds: readonly string[]; finalizeSaleIds: readonly string[] };
  withdrawUnused: { campaignId: string; campaignName: string };
  pause: { campaignId: string; campaignName: string };
  resume: { campaignId: string; campaignName: string };
  end: { campaignId: string; campaignName: string };
  registerPolicyVersion: {
    campaignId: string;
    campaignName: string;
    policy: CommissionPolicy;
    policyHash: Hex;
    effectiveAt: string;
  };
  mintDemoTokens: { amount: string };
};

export type TxKind = keyof TxParamsMap;

export type TxStepKind =
  | "approve"
  | "createCampaign"
  | "fundCampaign"
  | "activateCampaign"
  | "createNode"
  | "purchase"
  | "refund"
  | "finalize"
  | "claimRewards"
  | "claimProceeds"
  | "withdrawUnused"
  | "pause"
  | "resume"
  | "end"
  | "registerPolicyVersion"
  | "mintDemoTokens";

export type TxErrorPhase = "preflight" | "wallet" | "mined" | "network" | "never_included";

export type TxError = {
  code: ClientErrorCode;
  contractError: string | null;
  message: string;
  retryable: boolean;
  phase: TxErrorPhase;
  feePaidWei: string | null;
};

export type ReplacedReason = "repriced" | "cancelled" | "replaced";

export type TxStep = {
  id: string;
  kind: TxStepKind;
  target: string | null;
  status: TxState;
  interrupted: boolean;
  skipped: boolean;
  waitsForIndex: boolean;
  hash: Hex | null;
  nonce: number | null;
  gasLimit: string | null;
  maxFeePerGas: string | null;
  maxPriorityFeePerGas: string | null;
  blockNumber: string | null;
  feePaidWei: string | null;
  submittedAt: number | null;
  includedAt: number | null;
  confirmedAt: number | null;
  replacedReason: ReplacedReason | null;
  note: "alreadyDone" | "doneBeforeLeaving" | null;
  gasMarginBps: number;
  error: TxError | null;
};

export type TxRecord<K extends TxKind = TxKind> = {
  id: string;
  kind: K;
  mode: Mode;
  account: Hex;
  chainId: number;
  params: TxParamsMap[K];
  steps: TxStep[];
  resumeKey: string;
  startedAt: number;
  updatedAt: number;
  invalidates: readonly InvalidationTarget[];
  context: Readonly<Record<string, string>>;
  hiddenAt: number | null;
  outcomeSeen: boolean;
  backgroundNoticeShown: boolean;
  queuedBehind: string | null;
  syncing: boolean;
  expired: boolean;
};

export type AnyTxRecord = { [K in TxKind]: TxRecord<K> }[TxKind];
