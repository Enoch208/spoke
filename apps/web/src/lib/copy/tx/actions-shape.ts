import type { Message } from "../types";

export const txActionIds = {
  "TX-01": "createCampaign",
  "TX-02": "fundCampaign",
  "TX-03": "createNode",
  "TX-04": "purchase",
  "TX-05": "refund",
  "TX-06": "finalize",
  "TX-07": "claimRewards",
  "TX-08": "claimProceeds",
  "TX-09": "withdrawUnused",
  "TX-10": "pause",
  "TX-11": "resume",
  "TX-12": "end",
  "TX-13": "mintDemoTokens",
  "TX-14": "requestGas",
  "TX-15": "registerPolicyVersion",
} as const satisfies Record<`TX-${string}`, string>;

export type TxActionId = keyof typeof txActionIds;

export type TxActionName = (typeof txActionIds)[TxActionId];

export type TxCopy = string | readonly TxCopy[] | { readonly [key: string]: TxCopy };

export type TxCopySource = {
  readonly from:
    | "action.idle"
    | "action.beforeConfirm"
    | "action.progress"
    | "action.stepDone"
    | "action.success"
    | "action.success.title"
    | "action.success.body"
    | "action.success.actions"
    | "errorMapping"
    | "preflight"
    | "outcomes";
};

export type TxToast = {
  readonly text: string;
  readonly action?: string;
};

export type TxSuccess = Message & {
  readonly actions: readonly string[] | Readonly<Record<string, readonly string[]>>;
  readonly [line: string]: TxCopy;
};

export type TxActionCopy = {
  readonly name: string;
  readonly label: TxCopy;
  readonly steps: readonly string[];
  readonly idle: TxCopy;
  readonly beforeConfirm: TxCopy;
  readonly progress: TxCopy;
  readonly success: TxSuccess;
  readonly toast: TxToast;
  readonly failures: readonly string[];
  readonly summary: TxCopy;
  readonly [extra: string]: TxCopy | TxSuccess | TxToast;
};

export type TxOffchainActionCopy = {
  readonly name: string;
  readonly idle: string;
  readonly working: string;
  readonly success: string;
  readonly [extra: string]: TxCopy;
};
