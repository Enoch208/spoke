import { approvalAmount, encodeStep, MissingContextError, type EncodedCall } from "./calls";
import { alreadyDoneErrors, classifySendError, outOfGas, revertError, txError } from "./errors";
import type { Clock, LivePorts, ReceiptLite, Replacement, SignerPort } from "./ports";
import { contextFromLogs } from "./receipt-context";
import { raisedGasMarginBps } from "./records";
import type { AnyTxRecord, Hex, TxError, TxStep } from "./types";

export type StepOutcome = "done" | "stopped";

export type StepContext = {
  ports: LivePorts;
  clock: Clock;
  current: () => AnyTxRecord;
  step: () => TxStep;
  update: (patch: Partial<TxStep>) => void;
  setContext: (values: Readonly<Record<string, string>>) => void;
  setSyncing: (syncing: boolean) => void;
  waitForQueue: () => Promise<void>;
  beforeSign: (signer: SignerPort) => Promise<void>;
  wake: () => Promise<void>;
  afterHash: (hash: Hex) => void;
};

export const receiptTimeoutMs = 120_000;
export const syncingAfterMs = 30_000;
export const indexWaitLimitMs = 10 * 60_000;
export const finalityWaitLimitMs = 10 * 60_000;
export const unknownFastPollMs = 5_000;
export const unknownFastWindowMs = 2 * 60_000;
export const unknownSlowPollMs = 30_000;
export const unknownGiveUpMs = 30 * 60_000;

const reattachable = new Set(["submitted", "included", "confirmed", "indexed", "unknown"]);

const ceilScaled = (value: bigint, marginBps: number) =>
  (value * BigInt(10_000 + marginBps) + 9_999n) / 10_000n;

const fail = (ctx: StepContext, error: TxError): StepOutcome => {
  ctx.update({ status: error.code === "TX_REJECTED" ? "rejected" : "failed", error });
  return "stopped";
};

const declaredFee = (step: TxStep, receipt: ReceiptLite) =>
  (step.gasLimit ? BigInt(step.gasLimit) : receipt.gasUsed) * receipt.effectiveGasPrice;

const waitUntil = async (
  ctx: StepContext,
  check: () => Promise<boolean>,
  intervalMs: number,
  limitMs: number,
) => {
  const started = ctx.clock.now();
  while (ctx.clock.now() - started < limitMs) {
    const passed = await check().catch(() => false);
    if (passed) return true;
    await ctx.clock.sleep(intervalMs);
  }
  return false;
};

const finishReceipt = async (
  ctx: StepContext,
  call: EncodedCall,
  account: Hex,
  receipt: ReceiptLite,
): Promise<StepOutcome> => {
  const step = ctx.step();
  const fee = declaredFee(step, receipt).toString();
  if (receipt.status === "reverted") {
    const ranOutOfGas = step.gasLimit !== null && receipt.gasUsed >= BigInt(step.gasLimit);
    const name = ranOutOfGas
      ? outOfGas
      : await ctx.ports.reader
          .revertName({ ...call, account }, receipt.blockNumber)
          .catch(() => null);
    ctx.update({
      blockNumber: receipt.blockNumber.toString(),
      feePaidWei: fee,
      ...(ranOutOfGas ? { gasMarginBps: raisedGasMarginBps } : {}),
    });
    return fail(ctx, revertError(name, "mined", fee));
  }
  ctx.update({
    status: "included",
    blockNumber: receipt.blockNumber.toString(),
    includedAt: ctx.clock.now(),
    feePaidWei: fee,
  });
  ctx.setContext(contextFromLogs(step.kind, receipt.logs));
  const finalized = await waitUntil(
    ctx,
    async () => (await ctx.ports.reader.finalizedBlock()) >= receipt.blockNumber,
    1_000,
    finalityWaitLimitMs,
  );
  if (!finalized) return "stopped";
  ctx.update({ status: "confirmed", confirmedAt: ctx.clock.now() });
  if (!step.waitsForIndex) {
    ctx.update({ status: "done" });
    return "done";
  }
  const confirmedAt = ctx.clock.now();
  const indexed = await waitUntil(
    ctx,
    async () => {
      if (ctx.clock.now() - confirmedAt >= syncingAfterMs) ctx.setSyncing(true);
      const block = await ctx.ports.index.indexedBlock();
      return block !== null && block >= receipt.blockNumber;
    },
    2_000,
    indexWaitLimitMs,
  );
  if (!indexed) {
    ctx.setSyncing(true);
    return "stopped";
  }
  ctx.setSyncing(false);
  ctx.update({ status: "indexed" });
  return "done";
};

const resolveUnknown = async (
  ctx: StepContext,
  call: EncodedCall,
  account: Hex,
  hash: Hex,
): Promise<StepOutcome> => {
  ctx.update({ status: "unknown" });
  const started = ctx.clock.now();
  while (ctx.clock.now() - started < unknownGiveUpMs) {
    const elapsed = ctx.clock.now() - started;
    await Promise.race([
      ctx.clock.sleep(elapsed < unknownFastWindowMs ? unknownFastPollMs : unknownSlowPollMs),
      ctx.wake(),
    ]);
    const receipt = await ctx.ports.reader.getReceipt(hash).catch(() => null);
    if (receipt) {
      ctx.update({ status: "submitted", error: null });
      return finishReceipt(ctx, call, account, receipt);
    }
    const nonce = ctx.step().nonce;
    if (nonce === null) continue;
    const confirmedNonce = await ctx.ports.reader.confirmedNonce(account).catch(() => null);
    if (confirmedNonce !== null && confirmedNonce > nonce) {
      ctx.update({ status: "replaced", replacedReason: "replaced" });
      return "stopped";
    }
  }
  return fail(ctx, txError("INTERNAL", "never_included", { message: "Never included" }));
};

const follow = async (
  ctx: StepContext,
  call: EncodedCall,
  account: Hex,
  hash: Hex,
): Promise<StepOutcome> => {
  const seen: { replacement: Replacement | null } = { replacement: null };
  for (;;) {
    try {
      const receipt = await ctx.ports.reader.waitForReceipt(ctx.step().hash ?? hash, {
        timeoutMs: receiptTimeoutMs,
        onReplaced: (next) => {
          seen.replacement = next;
          if (next.reason === "repriced")
            ctx.update({ hash: next.hash, replacedReason: "repriced" });
        },
      });
      const replaced = seen.replacement;
      if (replaced && replaced.reason !== "repriced") {
        ctx.update({ status: "replaced", replacedReason: replaced.reason });
        return "stopped";
      }
      return await finishReceipt(ctx, call, account, receipt);
    } catch {
      const nonce = await ctx.ports.reader
        .transactionNonce(ctx.step().hash ?? hash)
        .catch(() => null);
      if (nonce === null) return resolveUnknown(ctx, call, account, ctx.step().hash ?? hash);
      ctx.update({ nonce });
    }
  }
};

const preflight = async (
  ctx: StepContext,
  signer: SignerPort,
  call: EncodedCall,
): Promise<{ gas: bigint; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } | StepOutcome> => {
  const { reader } = ctx.ports;
  const step = ctx.step();
  let estimate: bigint;
  try {
    estimate = await reader.estimateGas({ ...call, account: signer.address });
  } catch (error) {
    const classified = classifySendError(error, "preflight");
    if (classified.contractError && alreadyDoneErrors.has(classified.contractError)) {
      ctx.update({ status: "done", note: "alreadyDone", error: null });
      return "done";
    }
    return fail(ctx, classified);
  }
  try {
    const gas = ceilScaled(estimate, step.gasMarginBps);
    const fees = await reader.estimateFees();
    const balance = await reader.nativeBalance(signer.address);
    if (balance < gas * fees.maxFeePerGas)
      return fail(ctx, txError("INSUFFICIENT_MON", "preflight"));
    return { gas, ...fees };
  } catch (error) {
    return fail(ctx, classifySendError(error, "preflight"));
  }
};

const skipCoveredApproval = async (ctx: StepContext, signer: SignerPort) => {
  const amount = approvalAmount(ctx.current());
  const [allowance, balance] = await Promise.all([
    ctx.ports.reader.allowance(signer.address),
    ctx.ports.reader.tokenBalance(signer.address),
  ]);
  if (balance < amount) return fail(ctx, txError("INSUFFICIENT_SDUSD", "preflight"));
  if (allowance < amount) return null;
  ctx.update({ status: "done", skipped: true, error: null });
  return "done" as const;
};

export const runLiveStep = async (ctx: StepContext): Promise<StepOutcome> => {
  const step = ctx.step();
  const record = ctx.current();
  const { addresses } = ctx.ports;
  if (!addresses) return fail(ctx, txError("PROTOCOL_NOT_DEPLOYED", "preflight"));
  let call: EncodedCall;
  try {
    call = encodeStep(record, step, addresses);
  } catch (error) {
    if (error instanceof MissingContextError) {
      return fail(ctx, txError("INTERNAL", "preflight", { message: error.message }));
    }
    throw error;
  }
  if (step.hash && reattachable.has(step.status))
    return follow(ctx, call, record.account, step.hash);
  const signer = ctx.ports.signer();
  if (!signer) {
    ctx.update({ status: "not_submitted", interrupted: true });
    return "stopped";
  }
  try {
    if (signer.kind === "wallet" && (await signer.chainId()) !== ctx.ports.chainId) {
      return fail(ctx, txError("WRONG_NETWORK", "preflight", { retryable: true }));
    }
    if (step.interrupted && (await ctx.ports.reader.alreadyDone(record, step)) === true) {
      ctx.update({ status: "done", interrupted: false, note: "doneBeforeLeaving" });
      return "done";
    }
    if (step.kind === "approve") {
      const skipped = await skipCoveredApproval(ctx, signer);
      if (skipped) return skipped;
    }
  } catch (error) {
    return fail(ctx, classifySendError(error, "preflight"));
  }
  await ctx.waitForQueue();
  const prepared = await preflight(ctx, signer, call);
  if (prepared === "done" || prepared === "stopped") return prepared;
  await ctx.beforeSign(signer);
  ctx.update({
    status: "wallet_confirmation",
    interrupted: false,
    error: null,
    gasLimit: prepared.gas.toString(),
    maxFeePerGas: prepared.maxFeePerGas.toString(),
    maxPriorityFeePerGas: prepared.maxPriorityFeePerGas.toString(),
  });
  let sent: { hash: Hex; nonce: number | null };
  try {
    sent = await signer.send({ ...call, ...prepared });
  } catch (error) {
    return fail(ctx, classifySendError(error, "wallet"));
  }
  ctx.update({
    status: "submitted",
    hash: sent.hash,
    nonce: sent.nonce,
    submittedAt: ctx.clock.now(),
  });
  ctx.afterHash(sent.hash);
  return follow(ctx, call, record.account, sent.hash);
};
