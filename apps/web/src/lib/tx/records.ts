import type { TxState } from "@spoke/protocol";
import type { Mode } from "@/lib/stores/mode";
import { actions, type StepPlan } from "./actions";
import type { AnyTxRecord, Hex, TxKind, TxParamsMap, TxRecord, TxStep } from "./types";

export const defaultGasMarginBps = 1_000;
export const raisedGasMarginBps = 3_000;
export const interruptedExpiryMs = 24 * 60 * 60 * 1000;

const sentStatuses = new Set<TxState>(["submitted", "included", "confirmed", "indexed"]);
const settledStatuses = new Set<TxState>(["done"]);
const failureStatuses = new Set<TxState>(["rejected", "failed", "replaced"]);

export const blankStep = (plan: StepPlan, index: number): TxStep => ({
  id: `${String(index)}-${plan.kind}${plan.target ? `-${plan.target}` : ""}`,
  kind: plan.kind,
  target: plan.target,
  status: "not_submitted",
  interrupted: false,
  skipped: false,
  waitsForIndex: plan.waitsForIndex,
  hash: null,
  nonce: null,
  gasLimit: null,
  maxFeePerGas: null,
  maxPriorityFeePerGas: null,
  blockNumber: null,
  feePaidWei: null,
  submittedAt: null,
  includedAt: null,
  confirmedAt: null,
  replacedReason: null,
  note: null,
  gasMarginBps: defaultGasMarginBps,
  error: null,
});

export const createRecord = <K extends TxKind>(input: {
  id: string;
  kind: K;
  params: TxParamsMap[K];
  mode: Mode;
  account: Hex;
  chainId: number;
  now: number;
}): TxRecord<K> => {
  const spec = actions[input.kind];
  return {
    id: input.id,
    kind: input.kind,
    mode: input.mode,
    account: input.account,
    chainId: input.chainId,
    params: input.params,
    steps: spec.plan(input.params).map(blankStep),
    resumeKey: spec.resumeKey(input.params, input.now),
    startedAt: input.now,
    updatedAt: input.now,
    invalidates: spec.invalidates,
    context: {},
    hiddenAt: null,
    outcomeSeen: false,
    backgroundNoticeShown: false,
    queuedBehind: null,
    syncing: false,
    expired: false,
  };
};

export type TxOverall =
  | "checking"
  | "queued"
  | "interrupted"
  | "needs_confirmation"
  | "running"
  | "syncing"
  | "done"
  | "already_done"
  | "rejected"
  | "failed"
  | "unknown"
  | "replaced"
  | "expired";

export const overallStatus = (record: AnyTxRecord): TxOverall => {
  const { steps } = record;
  if (record.expired) return "expired";
  if (steps.some((step) => step.status === "failed")) return "failed";
  if (steps.some((step) => step.status === "rejected")) return "rejected";
  if (steps.some((step) => step.status === "replaced" && step.replacedReason !== "repriced")) {
    return "replaced";
  }
  if (steps.some((step) => step.status === "unknown")) return "unknown";
  if (steps.every((step) => step.status === "done")) {
    const nothingSent = steps.every((step) => step.hash === null);
    return nothingSent && steps.some((step) => step.note === "alreadyDone")
      ? "already_done"
      : "done";
  }
  if (record.syncing) return "syncing";
  if (steps.some((step) => step.interrupted && step.status === "not_submitted"))
    return "interrupted";
  if (steps.some((step) => step.status === "wallet_confirmation")) return "needs_confirmation";
  if (steps.some((step) => sentStatuses.has(step.status) || settledStatuses.has(step.status))) {
    return "running";
  }
  return record.queuedBehind ? "queued" : "checking";
};

const terminalOverall = new Set<TxOverall>([
  "done",
  "already_done",
  "rejected",
  "failed",
  "replaced",
  "expired",
]);

export const isTerminal = (record: AnyTxRecord) => terminalOverall.has(overallStatus(record));

export const isActive = (record: AnyTxRecord) => !isTerminal(record);

export const anythingSent = (record: AnyTxRecord) =>
  record.steps.some((step) => step.hash !== null);

export const currentStepIndex = (record: AnyTxRecord) => {
  const index = record.steps.findIndex((step) => step.status !== "done");
  return index === -1 ? record.steps.length - 1 : index;
};

export const holdsSignerQueue = (record: AnyTxRecord) =>
  record.steps.some((step) => step.status === "wallet_confirmation" || step.status === "submitted");

export const blockingRecord = (
  records: readonly AnyTxRecord[],
  candidate: AnyTxRecord,
): AnyTxRecord | null =>
  records.find(
    (record) =>
      record.id !== candidate.id &&
      record.mode === candidate.mode &&
      record.account.toLowerCase() === candidate.account.toLowerCase() &&
      holdsSignerQueue(record),
  ) ?? null;

export const findResumable = (records: readonly AnyTxRecord[], resumeKey: string, mode: Mode) =>
  records.find(
    (record) => record.resumeKey === resumeKey && record.mode === mode && isActive(record),
  ) ?? null;

export const failureStep = (record: AnyTxRecord) =>
  record.steps.find((step) => failureStatuses.has(step.status) || step.status === "unknown") ??
  null;

export const totalFeePaid = (record: AnyTxRecord) =>
  record.steps.reduce((sum, step) => sum + (step.feePaidWei ? BigInt(step.feePaidWei) : 0n), 0n);

export const interruptOnReload = (record: AnyTxRecord, now: number): AnyTxRecord => {
  const steps = record.steps.map((step) =>
    step.status === "wallet_confirmation" && step.hash === null
      ? { ...step, status: "not_submitted" as const, interrupted: true }
      : step,
  );
  const interrupted = steps.some((step) => step.interrupted && step.status === "not_submitted");
  const expired = interrupted && now - record.updatedAt > interruptedExpiryMs;
  return { ...record, steps, expired, queuedBehind: null };
};

export const needsReattach = (record: AnyTxRecord) =>
  record.steps.some(
    (step) =>
      step.hash !== null &&
      (step.status === "submitted" ||
        step.status === "included" ||
        step.status === "confirmed" ||
        step.status === "unknown"),
  );
