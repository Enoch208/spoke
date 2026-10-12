import type { Mode } from "@/lib/stores/mode";
import type { StepContext, StepOutcome } from "./live-step";
import type { Clock, LivePorts, SignerPort } from "./ports";
import {
  anythingSent,
  blockingRecord,
  createRecord,
  findResumable,
  interruptOnReload,
  isTerminal,
  needsReattach,
  overallStatus,
} from "./records";
import type { AnyTxRecord, Hex, TxKind, TxParamsMap, TxStep } from "./types";

export type TxEventType =
  | "hidden"
  | "walletWaiting"
  | "sent"
  | "syncing"
  | "done"
  | "rejected"
  | "failed"
  | "unknown"
  | "replaced"
  | "resumed"
  | "interrupted";

export type TxEvent = { type: TxEventType; record: AnyTxRecord; count?: number };

export type TxStoreApi = {
  records: () => readonly AnyTxRecord[];
  upsert: (record: AnyTxRecord) => void;
  patchRecord: (id: string, patch: Partial<Omit<AnyTxRecord, "id" | "kind" | "params">>) => void;
  patchStep: (id: string, stepId: string, patch: Partial<TxStep>) => void;
  remove: (id: string) => void;
};

export type StepRunner = (context: StepContext) => Promise<StepOutcome>;

export type EngineDeps = {
  store: TxStoreApi;
  clock: Clock;
  ports: (mode: Mode) => LivePorts;
  runner: (mode: Mode) => StepRunner;
  invalidate: (record: AnyTxRecord) => Promise<void>;
  emit: (event: TxEvent) => void;
  openSheet: (recordId: string) => void;
  beforeSign: (record: AnyTxRecord, signer: SignerPort) => Promise<void>;
  afterHash: (record: AnyTxRecord, hash: Hex) => void;
  newId: () => string;
};

export type StartOptions = { mode: Mode; account: Hex; chainId: number };

const outcomeEvents: Partial<Record<ReturnType<typeof overallStatus>, TxEventType>> = {
  done: "done",
  already_done: "done",
  rejected: "rejected",
  failed: "failed",
  unknown: "unknown",
  replaced: "replaced",
  syncing: "syncing",
};

export class TxEngine {
  private readonly running = new Map<string, Promise<void>>();
  private readonly wakers = new Map<string, () => void>();

  constructor(private readonly deps: EngineDeps) {}

  private record(id: string) {
    return this.deps.store.records().find((record) => record.id === id) ?? null;
  }

  start<K extends TxKind>(kind: K, params: TxParamsMap[K], options: StartOptions): string {
    const now = this.deps.clock.now();
    const draft = createRecord({ id: this.deps.newId(), kind, params, now, ...options });
    const existing = findResumable(this.deps.store.records(), draft.resumeKey, options.mode);
    if (existing) {
      this.deps.openSheet(existing.id);
      if (!isTerminal(existing) && !this.running.has(existing.id) && needsReattach(existing)) {
        void this.run(existing.id);
      }
      return existing.id;
    }
    const record: AnyTxRecord = draft as AnyTxRecord;
    this.deps.store.upsert(record);
    this.deps.openSheet(record.id);
    void this.run(record.id);
    return record.id;
  }

  run(id: string): Promise<void> {
    const active = this.running.get(id);
    if (active) return active;
    const task = this.drive(id).finally(() => {
      this.running.delete(id);
    });
    this.running.set(id, task);
    return task;
  }

  isRunning(id: string) {
    return this.running.has(id);
  }

  private context(id: string, stepId: string, mode: Mode): StepContext {
    const store = this.deps.store;
    const current = () => {
      const record = this.record(id);
      if (!record) throw new Error(`Transaction ${id} disappeared`);
      return record;
    };
    return {
      ports: this.deps.ports(mode),
      clock: this.deps.clock,
      current,
      step: () => {
        const step = current().steps.find((candidate) => candidate.id === stepId);
        if (!step) throw new Error(`Step ${stepId} disappeared`);
        return step;
      },
      update: (patch) => {
        store.patchStep(id, stepId, patch);
        if (patch.status === "wallet_confirmation") {
          this.deps.emit({ type: "walletWaiting", record: current() });
        }
        if (patch.status === "submitted") this.deps.emit({ type: "sent", record: current() });
      },
      setContext: (values) => {
        if (Object.keys(values).length === 0) return;
        store.patchRecord(id, { context: { ...current().context, ...values } });
      },
      setSyncing: (syncing) => {
        if (current().syncing === syncing) return;
        store.patchRecord(id, { syncing });
        if (syncing) this.deps.emit({ type: "syncing", record: current() });
      },
      waitForQueue: async () => {
        for (;;) {
          const blocker = blockingRecord(store.records(), current());
          store.patchRecord(id, { queuedBehind: blocker?.id ?? null });
          if (!blocker) return;
          await this.deps.clock.sleep(1_000);
        }
      },
      beforeSign: async (signer) => {
        if (signer.walletName) {
          store.patchRecord(id, {
            context: { ...current().context, walletName: signer.walletName },
          });
        }
        const record = current();
        if (signer.kind === "passkey" && record.hiddenAt !== null) this.show(id);
        await this.deps.beforeSign(record, signer);
      },
      wake: () =>
        new Promise<void>((resolve) => {
          this.wakers.set(id, resolve);
        }),
      afterHash: (hash) => {
        this.deps.afterHash(current(), hash);
      },
    };
  }

  private async drive(id: string) {
    for (;;) {
      const record = this.record(id);
      if (!record || isTerminal(record)) break;
      const step = record.steps.find((candidate) => candidate.status !== "done");
      if (!step) break;
      const outcome = await this.deps.runner(record.mode)(this.context(id, step.id, record.mode));
      if (outcome === "stopped") break;
      const after = this.record(id);
      const finished = after?.steps.find((candidate) => candidate.id === step.id);
      if (after && finished?.status === "indexed") {
        await this.deps.invalidate(after);
        this.deps.store.patchStep(id, step.id, { status: "done" });
      }
    }
    const final = this.record(id);
    if (!final) return;
    const event = outcomeEvents[overallStatus(final)];
    if (event) this.deps.emit({ type: event, record: final });
  }

  private resetFailedStep(id: string, checkFirst: boolean) {
    const record = this.record(id);
    const step = record?.steps.find((candidate) => candidate.status !== "done");
    if (!record || !step) return;
    this.deps.store.patchRecord(id, { outcomeSeen: false, expired: false });
    this.deps.store.patchStep(id, step.id, {
      status: "not_submitted",
      error: null,
      replacedReason: null,
      interrupted: checkFirst || step.interrupted,
      ...(step.status === "rejected" || step.status === "failed"
        ? { hash: null, nonce: null }
        : {}),
    });
  }

  retry(id: string) {
    const record = this.record(id);
    if (!record) return;
    const checkFirst = overallStatus(record) === "replaced";
    this.resetFailedStep(id, checkFirst);
    this.deps.openSheet(id);
    void this.run(id);
  }

  continueInterrupted(id: string) {
    this.deps.openSheet(id);
    void this.run(id);
  }

  checkAgain(id: string) {
    this.wakers.get(id)?.();
    this.wakers.delete(id);
  }

  cancel(id: string) {
    const record = this.record(id);
    if (!record || anythingSent(record)) return false;
    this.deps.store.remove(id);
    return true;
  }

  hide(id: string) {
    const record = this.record(id);
    if (!record) return;
    this.deps.store.patchRecord(id, { hiddenAt: this.deps.clock.now() });
    if (!isTerminal(record)) this.deps.emit({ type: "hidden", record });
  }

  show(id: string) {
    this.deps.store.patchRecord(id, { hiddenAt: null });
    this.deps.openSheet(id);
  }

  markSeen(id: string) {
    this.deps.store.patchRecord(id, { outcomeSeen: true });
  }

  resumeAfterReload(account: Hex, mode: Mode) {
    const now = this.deps.clock.now();
    let resumed = 0;
    let lastResumed: AnyTxRecord | null = null;
    for (const original of this.deps.store.records()) {
      if (original.mode !== mode || original.account.toLowerCase() !== account.toLowerCase())
        continue;
      if (isTerminal(original) || this.running.has(original.id)) continue;
      const record = interruptOnReload(original, now);
      this.deps.store.upsert(record);
      if (needsReattach(record)) {
        resumed += 1;
        lastResumed = record;
        void this.run(record.id);
      } else if (overallStatus(record) === "interrupted") {
        this.deps.emit({ type: "interrupted", record });
      }
    }
    if (lastResumed) this.deps.emit({ type: "resumed", record: lastResumed, count: resumed });
  }
}
