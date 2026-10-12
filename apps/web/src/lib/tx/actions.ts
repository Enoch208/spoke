import { protocolLimits } from "@spoke/protocol";
import type { FeatureKey } from "@/lib/features";
import type { InvalidationTarget } from "@/lib/query/keys";
import type { TxKind, TxParamsMap, TxStepKind } from "./types";

export type StepPlan = { kind: TxStepKind; target: string | null; waitsForIndex: boolean };

export type QuickActionRule = "allowed" | "capped" | "always-prompt";

type ActionSpec<K extends TxKind> = {
  feature: FeatureKey;
  plan: (params: TxParamsMap[K]) => StepPlan[];
  resumeKey: (params: TxParamsMap[K], startedAt: number) => string;
  invalidates: readonly InvalidationTarget[];
  quickAction: QuickActionRule;
  alreadyDoneCheckable: boolean;
};

type ActionTable = { [K in TxKind]: ActionSpec<K> };

const step = (kind: TxStepKind, target: string | null = null, waitsForIndex = false): StepPlan => ({
  kind,
  target,
  waitsForIndex,
});

const single = (kind: TxStepKind) => () => [step(kind, null, true)];

const finalizeSteps = (saleIds: readonly string[]) =>
  saleIds.slice(0, protocolLimits.maxBatchFinalize).map((saleId) => step("finalize", saleId));

export const actions: ActionTable = {
  createCampaign: {
    feature: "composer",
    plan: () => [
      step("createCampaign"),
      step("approve"),
      step("fundCampaign"),
      step("activateCampaign", null, true),
    ],
    resumeKey: (params) => `createCampaign:${params.draftId}`,
    invalidates: ["campaigns.mine", "vault.get"],
    quickAction: "always-prompt",
    alreadyDoneCheckable: true,
  },
  fundCampaign: {
    feature: "vault",
    plan: () => [step("approve"), step("fundCampaign", null, true)],
    resumeKey: (params, startedAt) =>
      `fundCampaign:${params.campaignId}:${params.amount}:${String(startedAt)}`,
    invalidates: ["vault", "campaigns.get"],
    quickAction: "always-prompt",
    alreadyDoneCheckable: false,
  },
  createNode: {
    feature: "links",
    plan: single("createNode"),
    resumeKey: (params) => `createNode:${params.campaignId}`,
    invalidates: ["links", "graph"],
    quickAction: "allowed",
    alreadyDoneCheckable: true,
  },
  purchase: {
    feature: "checkout",
    plan: () => [step("approve"), step("purchase", null, true)],
    resumeKey: (params) => `purchase:${params.campaignId}:${params.orderKey}`,
    invalidates: ["receipts", "earnings", "vault.get", "campaigns.stats", "account.balances"],
    quickAction: "capped",
    alreadyDoneCheckable: true,
  },
  refund: {
    feature: "settlement",
    plan: single("refund"),
    resumeKey: (params) => `refund:${params.saleId}`,
    invalidates: ["receipts", "earnings", "vault.get", "reputation", "distributors"],
    quickAction: "always-prompt",
    alreadyDoneCheckable: true,
  },
  finalize: {
    feature: "settlement",
    plan: (params) => [step("finalize", params.saleId, true)],
    resumeKey: (params) => `finalize:${params.saleId}`,
    invalidates: ["receipts.get", "earnings", "vault.get", "reputation", "distributors"],
    quickAction: "allowed",
    alreadyDoneCheckable: true,
  },
  claimRewards: {
    feature: "settlement",
    plan: (params) => [...finalizeSteps(params.finalizeSaleIds), step("claimRewards", null, true)],
    resumeKey: (params) => `claimRewards:${params.token}`,
    invalidates: ["earnings", "account.balances", "receipts"],
    quickAction: "allowed",
    alreadyDoneCheckable: true,
  },
  claimProceeds: {
    feature: "settlement",
    plan: (params) => {
      const claims = [...params.campaignIds].sort();
      return [
        ...finalizeSteps(params.finalizeSaleIds),
        ...claims.map((campaignId, index) =>
          step("claimProceeds", campaignId, index === claims.length - 1),
        ),
      ];
    },
    resumeKey: (params) => `claimProceeds:${[...params.campaignIds].sort().join(",")}`,
    invalidates: ["vault", "receipts", "account.balances"],
    quickAction: "allowed",
    alreadyDoneCheckable: true,
  },
  withdrawUnused: {
    feature: "vault",
    plan: single("withdrawUnused"),
    resumeKey: (params) => `withdrawUnused:${params.campaignId}`,
    invalidates: ["vault", "campaigns.get"],
    quickAction: "always-prompt",
    alreadyDoneCheckable: true,
  },
  pause: {
    feature: "vault",
    plan: single("pause"),
    resumeKey: (params) => `pause:${params.campaignId}`,
    invalidates: ["campaigns"],
    quickAction: "allowed",
    alreadyDoneCheckable: true,
  },
  resume: {
    feature: "vault",
    plan: single("resume"),
    resumeKey: (params) => `resume:${params.campaignId}`,
    invalidates: ["campaigns"],
    quickAction: "allowed",
    alreadyDoneCheckable: true,
  },
  end: {
    feature: "vault",
    plan: single("end"),
    resumeKey: (params) => `end:${params.campaignId}`,
    invalidates: ["campaigns", "vault"],
    quickAction: "always-prompt",
    alreadyDoneCheckable: true,
  },
  registerPolicyVersion: {
    feature: "composer",
    plan: single("registerPolicyVersion"),
    resumeKey: (params) => `registerPolicyVersion:${params.campaignId}:${params.policyHash}`,
    invalidates: ["campaigns.policy", "campaigns.get", "campaigns.mine"],
    quickAction: "always-prompt",
    alreadyDoneCheckable: true,
  },
  mintDemoTokens: {
    feature: "gasSponsorship",
    plan: single("mintDemoTokens"),
    resumeKey: (params, startedAt) => `mintDemoTokens:${params.amount}:${String(startedAt)}`,
    invalidates: ["funding.status", "account.balances"],
    quickAction: "allowed",
    alreadyDoneCheckable: false,
  },
};

export const planSteps = <K extends TxKind>(kind: K, params: TxParamsMap[K]) =>
  actions[kind].plan(params);

export const resumeKeyFor = <K extends TxKind>(
  kind: K,
  params: TxParamsMap[K],
  startedAt: number,
) => actions[kind].resumeKey(params, startedAt);

export const purchaseAmountMinor = <K extends TxKind>(kind: K, params: TxParamsMap[K]) =>
  "price" in params && kind === "purchase" ? BigInt(params.price) : 0n;

export const needsPasskeyPrompt = (
  kind: TxKind,
  quickActionsActive: boolean,
  purchaseMinor: bigint,
  capMinor: bigint,
) => {
  if (!quickActionsActive) return true;
  const rule = actions[kind].quickAction;
  if (rule === "always-prompt") return true;
  if (rule === "capped") return purchaseMinor > capMinor;
  return false;
};
