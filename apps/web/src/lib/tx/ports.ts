import type { Log } from "viem";
import type { ContractAddresses, EncodedCall } from "./calls";
import type { AnyTxRecord, Hex, ReplacedReason, TxStep } from "./types";

export type ReceiptLite = {
  status: "success" | "reverted";
  blockNumber: bigint;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  logs: readonly Log[];
};

export type Replacement = { reason: ReplacedReason; hash: Hex };

export type SendRequest = EncodedCall & {
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

export type ChainReader = {
  estimateGas: (request: EncodedCall & { account: Hex }) => Promise<bigint>;
  estimateFees: () => Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }>;
  nativeBalance: (address: Hex) => Promise<bigint>;
  tokenBalance: (address: Hex) => Promise<bigint>;
  allowance: (owner: Hex) => Promise<bigint>;
  waitForReceipt: (
    hash: Hex,
    options: { timeoutMs: number; onReplaced: (replacement: Replacement) => void },
  ) => Promise<ReceiptLite>;
  getReceipt: (hash: Hex) => Promise<ReceiptLite | null>;
  transactionNonce: (hash: Hex) => Promise<number | null>;
  finalizedBlock: () => Promise<bigint>;
  confirmedNonce: (address: Hex) => Promise<number>;
  revertName: (
    request: EncodedCall & { account: Hex },
    blockNumber: bigint,
  ) => Promise<string | null>;
  alreadyDone: (record: AnyTxRecord, step: TxStep) => Promise<boolean | null>;
};

export type SignerPort = {
  address: Hex;
  kind: "passkey" | "wallet";
  walletName: string | null;
  chainId: () => Promise<number>;
  send: (request: SendRequest) => Promise<{ hash: Hex; nonce: number | null }>;
};

export type IndexPort = { indexedBlock: () => Promise<bigint | null> };

export type LivePorts = {
  addresses: ContractAddresses | null;
  chainId: number;
  reader: ChainReader;
  signer: () => SignerPort | null;
  index: IndexPort;
};

export type Clock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
};
