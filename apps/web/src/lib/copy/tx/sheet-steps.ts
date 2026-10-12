import type { TxState } from "@spoke/protocol";
import type { Tone } from "../../../components/ui/tone";
import { common } from "../common";
import { required } from "../required";
import type { TxCopy, TxCopySource } from "./actions-shape";
import { txEngineStates } from "./engine";
import { txReplacementOutcomes } from "./outcomes";

type StepStateCopy = {
  readonly state: TxState;
  readonly chip: string;
  readonly tone?: Tone;
  readonly subLine: TxCopy | TxCopySource;
  readonly actions: readonly string[];
  readonly [timed: string]: TxCopy | TxCopySource | undefined;
};

const reportProblem = "Report a problem";
const checkAgain = "Check again";
const engine = txEngineStates;

export const txConfirmedSyncing = "Confirmed onchain. We are syncing recent transactions.";

export const txStepStates = {
  upNext: {
    state: "not_submitted",
    chip: "Up next",
    tone: "faint",
    subLine: "Starts after step {previousStep}.",
    actions: [common.hide],
  },
  interrupted: {
    state: "not_submitted",
    chip: "Not sent",
    tone: "amber",
    subLine: "This was interrupted before it was sent. Nothing was charged.",
    actions: ["Continue", common.cancel],
  },
  queued: {
    state: "not_submitted",
    chip: "Waiting",
    tone: "faint",
    subLine: "Waiting for your other transaction to finish.",
    actions: ["Show it"],
  },
  confirmInWallet: {
    state: "wallet_confirmation",
    chip: "Confirm",
    tone: "amber",
    subLine: engine.wallet_confirmation.helper.wallet,
    after20s: "Not seeing it? Open {wallet}, or send the request again.",
    cancelHint: "Reject it in {wallet} to cancel.",
    actions: ["Send request again", common.hide],
  },
  confirmWithPasskey: {
    state: "wallet_confirmation",
    chip: "Confirm",
    tone: "amber",
    subLine: engine.wallet_confirmation.helper.passkey,
    actions: [],
  },
  quickActionSigning: {
    state: "wallet_confirmation",
    chip: "Signing",
    subLine: "Signing on this device.",
    actions: [],
  },
  submitted: {
    state: "submitted",
    chip: "Sent",
    tone: "sky",
    subLine: engine.submitted.helper,
    purchaseSubLine: required.awaitingPurchase,
    after15s: "Taking longer than usual. Monad Testnet may be busy.",
    actions: [common.hide, common.viewOnExplorer],
  },
  included: {
    state: "included",
    chip: "In a block",
    tone: "sky",
    subLine: [engine.included.stepLine, engine.included.helper],
    actions: [common.hide, common.viewOnExplorer],
  },
  confirmed: {
    state: "confirmed",
    chip: "Confirmed",
    tone: "lime",
    subLine: { intermediateStep: "Confirmed onchain.", lastStep: engine.confirmed.helper },
    after30s: txConfirmedSyncing,
    actions: [common.hide, common.viewOnExplorer],
  },
  indexed: {
    state: "indexed",
    chip: "Recorded",
    tone: "lime",
    subLine: engine.indexed.helper,
    actions: [],
  },
  done: {
    state: "done",
    chip: "Done",
    tone: "lime",
    subLine: { from: "action.stepDone" },
    actions: [],
  },
  rejected: {
    state: "rejected",
    chip: "Cancelled",
    tone: "faint",
    subLine: engine.rejected.helper,
    actions: [common.tryAgain, common.close],
  },
  failed: {
    state: "failed",
    chip: "Failed",
    tone: "pink",
    subLine: {
      beforeSending: engine.failed.beforeSending.helper,
      reverted: engine.failed.reverted.helper,
    },
    actions: [common.tryAgain, common.viewOnExplorer, reportProblem],
  },
  unknown: {
    state: "unknown",
    chip: "Checking",
    tone: "amber",
    subLine: engine.unknown.helper,
    actions: [checkAgain, common.viewOnExplorer, reportProblem, common.hide],
  },
  spedUp: {
    state: "replaced",
    chip: "Sped up",
    tone: "sky",
    subLine: txReplacementOutcomes.repriced.stepLine,
    actions: [common.hide],
  },
  cancelledInWallet: {
    state: "replaced",
    chip: "Cancelled in wallet",
    tone: "faint",
    subLine: txReplacementOutcomes.cancelled.body,
    actions: [common.tryAgain, common.close],
  },
  replaced: {
    state: "replaced",
    chip: "Replaced",
    tone: "pink",
    subLine: txReplacementOutcomes.replaced.body,
    actions: [checkAgain, common.close],
  },
} as const satisfies Record<string, StepStateCopy>;

export const txReportProblem = {
  action: reportProblem,
  category: "A transaction problem",
} as const;
