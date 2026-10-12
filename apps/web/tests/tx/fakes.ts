import { ExecutionRevertedError, encodeErrorResult, RawContractError } from "viem";
import { spokeProtocolAbi } from "@spoke/protocol";
import { TxEngine, type TxEvent, type TxStoreApi } from "@/lib/tx/engine";
import { runLiveStep } from "@/lib/tx/live-step";
import type { ChainReader, Clock, LivePorts, ReceiptLite, SignerPort } from "@/lib/tx/ports";
import type { AnyTxRecord, Hex, TxStep } from "@/lib/tx/types";

export const account: Hex = "0x00000000000000000000000000000000000000b1";
export const protocol: Hex = "0x00000000000000000000000000000000000000aa";
export const token: Hex = "0x00000000000000000000000000000000000000bb";
export const orderKey: Hex = `0x${"11".repeat(32)}`;

export const hashOf = (n: number): Hex => `0x${n.toString(16).padStart(64, "0")}`;

export const fakeClock = () => {
  let now = 1_000_000;
  const clock: Clock & { advance: (ms: number) => void; current: () => number } = {
    now: () => now,
    sleep: async (ms) => {
      now += ms;
      await Promise.resolve();
    },
    advance: (ms) => {
      now += ms;
    },
    current: () => now,
  };
  return clock;
};

export const memoryStore = () => {
  let records: AnyTxRecord[] = [];
  const store: TxStoreApi & { all: () => AnyTxRecord[] } = {
    records: () => records,
    all: () => records,
    upsert: (record) => {
      records = [record, ...records.filter((item) => item.id !== record.id)];
    },
    patchRecord: (id, patch) => {
      records = records.map((record) => (record.id === id ? { ...record, ...patch } : record));
    },
    patchStep: (id, stepId, patch: Partial<TxStep>) => {
      records = records.map((record) =>
        record.id === id
          ? {
              ...record,
              steps: record.steps.map((step) =>
                step.id === stepId ? { ...step, ...patch } : step,
              ),
            }
          : record,
      );
    },
    remove: (id) => {
      records = records.filter((record) => record.id !== id);
    },
  };
  return store;
};

export const revertWith = (errorName: "SelfReferral" | "OrderAlreadyUsed" | "SaleNotMature") => {
  const args =
    errorName === "SelfReferral"
      ? ([account] as const)
      : errorName === "OrderAlreadyUsed"
        ? ([orderKey] as const)
        : ([1n, 2n] as const);
  const data = encodeErrorResult({ abi: spokeProtocolAbi, errorName, args });
  return new ExecutionRevertedError({ cause: new RawContractError({ data }) });
};

export const receipt = (overrides: Partial<ReceiptLite> = {}): ReceiptLite => ({
  status: "success",
  blockNumber: 100n,
  gasUsed: 50_000n,
  effectiveGasPrice: 2n,
  logs: [],
  ...overrides,
});

export type ReaderOverrides = Partial<ChainReader>;

export const fakeReader = (overrides: ReaderOverrides = {}): ChainReader => ({
  estimateGas: () => Promise.resolve(100_000n),
  estimateFees: () => Promise.resolve({ maxFeePerGas: 10n, maxPriorityFeePerGas: 1n }),
  nativeBalance: () => Promise.resolve(10n ** 18n),
  tokenBalance: () => Promise.resolve(10n ** 12n),
  allowance: () => Promise.resolve(0n),
  waitForReceipt: () => Promise.resolve(receipt()),
  getReceipt: () => Promise.resolve(null),
  transactionNonce: () => Promise.resolve(null),
  finalizedBlock: () => Promise.resolve(1_000n),
  confirmedNonce: () => Promise.resolve(0),
  revertName: () => Promise.resolve(null),
  alreadyDone: () => Promise.resolve(false),
  ...overrides,
});

export const fakeSigner = (overrides: Partial<SignerPort> = {}) => {
  const sent: Parameters<SignerPort["send"]>[0][] = [];
  let counter = 0;
  const signer: SignerPort = {
    address: account,
    kind: "wallet",
    walletName: "Test Wallet",
    chainId: () => Promise.resolve(10143),
    send: (request) => {
      sent.push(request);
      counter += 1;
      return Promise.resolve({ hash: hashOf(counter), nonce: counter - 1 });
    },
    ...overrides,
  };
  return { signer, sent };
};

export const setup = (
  options: {
    reader?: ReaderOverrides;
    signer?: SignerPort | null;
    indexed?: () => Promise<bigint | null>;
    addresses?: LivePorts["addresses"];
  } = {},
) => {
  const clock = fakeClock();
  const store = memoryStore();
  const events: TxEvent[] = [];
  const invalidated: string[] = [];
  const attached: Hex[] = [];
  const opened: string[] = [];
  const signerBundle = fakeSigner();
  const signer = options.signer === undefined ? signerBundle.signer : options.signer;
  const ports: LivePorts = {
    addresses: options.addresses === undefined ? { protocol, token } : options.addresses,
    chainId: 10143,
    reader: fakeReader(options.reader),
    signer: () => signer,
    index: { indexedBlock: options.indexed ?? (() => Promise.resolve(1_000n)) },
  };
  let ids = 0;
  const engine = new TxEngine({
    store,
    clock,
    ports: () => ports,
    runner: () => runLiveStep,
    invalidate: (record) => {
      invalidated.push(record.id);
      return Promise.resolve();
    },
    emit: (event) => {
      events.push(event);
    },
    openSheet: (id) => {
      opened.push(id);
    },
    beforeSign: () => Promise.resolve(),
    afterHash: (_record, hash) => {
      attached.push(hash);
    },
    newId: () => {
      ids += 1;
      return `tx-${String(ids)}`;
    },
  });
  return { engine, store, clock, events, invalidated, attached, opened, sent: signerBundle.sent };
};

export const purchaseParams = {
  campaignId: "7",
  nodeId: "3",
  orderKey,
  price: "40000000",
  productTitle: "Design Systems Handbook",
  merchantName: "Northwind",
  intentId: "intent-1",
};

export const startPurchase = (bundle: ReturnType<typeof setup>) =>
  bundle.engine.start("purchase", purchaseParams, { mode: "live", account, chainId: 10143 });

export const settle = async (bundle: ReturnType<typeof setup>, id: string) => {
  await bundle.engine.run(id);
  const record = bundle.store.all().find((item) => item.id === id);
  if (!record) throw new Error("record missing");
  return record;
};
