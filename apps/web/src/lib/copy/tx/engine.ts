import type { TxState } from "@spoke/protocol";
import { required } from "../required";
import type { TxActionName, TxCopySource } from "./actions-shape";

type EngineLine = string | TxCopySource | readonly (string | TxCopySource)[];

type EngineText = EngineLine | Readonly<Record<"wallet" | "passkey", string>>;

type EngineStateCopy = {
  readonly button: EngineText;
  readonly buttonAfter?: TxCopySource;
  readonly stepLine?: EngineLine;
  readonly helper: EngineText;
};

type TxEngineCopy = Record<Exclude<TxState, "failed">, EngineStateCopy> & {
  readonly failed: Readonly<Record<"beforeSending" | "reverted", EngineStateCopy>>;
};

const idle = { from: "action.idle" } as const;
const progress = { from: "action.progress" } as const;
const mappedError = { from: "errorMapping" } as const;
const outcome = { from: "outcomes" } as const;

export const txEngineStates = {
  not_submitted: {
    button: idle,
    helper: { from: "action.beforeConfirm" },
  },
  wallet_confirmation: {
    button: { wallet: "Confirm in wallet", passkey: "Confirm with passkey" },
    stepLine: "Waiting for you",
    helper: {
      wallet:
        "Check the amount and network in your wallet, then confirm. Nothing is sent until you do.",
      passkey: "Use your passkey to confirm. Nothing is sent until you do.",
    },
  },
  submitted: {
    button: progress,
    stepLine: "Sent",
    helper: "Sent to Monad Testnet. Waiting for it to be included in a block.",
  },
  included: {
    button: progress,
    stepLine: "Included in block {block}",
    helper: "Waiting for confirmation. This isn’t final yet.",
  },
  confirmed: {
    button: "Finishing…",
    stepLine: "Confirmed",
    helper: "Confirmed onchain. Updating Spoke…",
  },
  indexed: {
    button: "Finishing…",
    stepLine: "Recorded",
    helper: "Spoke has recorded it.",
  },
  done: {
    button: { from: "action.success.title" },
    buttonAfter: { from: "action.success.actions" },
    stepLine: { from: "action.success.title" },
    helper: { from: "action.success.body" },
  },
  rejected: {
    button: idle,
    stepLine: "Cancelled",
    helper: "Cancelled in your wallet. Nothing was sent and no fee was charged.",
  },
  failed: {
    beforeSending: {
      button: idle,
      stepLine: "Couldn’t send",
      helper: [mappedError, "Nothing was sent."],
    },
    reverted: {
      button: idle,
      stepLine: "Didn’t go through",
      helper: [mappedError, "The network fee was used; nothing else changed."],
    },
  },
  unknown: {
    button: "Check status",
    stepLine: "Unconfirmed",
    helper: [required.unverified, "Don’t send it again until this resolves."],
  },
  replaced: {
    button: outcome,
    stepLine: outcome,
    helper: outcome,
  },
} as const satisfies TxEngineCopy;

export const txQuickActions = {
  covered: [
    "createNode",
    "purchase",
    "finalize",
    "claimRewards",
    "claimProceeds",
    "mintDemoTokens",
    "pause",
    "resume",
  ],
  alwaysPrompt: [
    "createCampaign",
    "fundCampaign",
    "withdrawUnused",
    "refund",
    "end",
    "registerPolicyVersion",
  ],
  alwaysPromptAlso: ["signerActions", "purchaseOverCap", "securityChanges"],
  coveredSkipsTo: "submitted",
} as const satisfies {
  readonly covered: readonly TxActionName[];
  readonly alwaysPrompt: readonly TxActionName[];
  readonly alwaysPromptAlso: readonly string[];
  readonly coveredSkipsTo: TxState;
};
