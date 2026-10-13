import { describe, expect, it } from "vitest";
import { z } from "zod";
import { encodeAbiParameters, encodeEventTopics, erc20Abi, parseAbiParameters } from "viem";
import { auroraDeposit } from "@spoke/protocol";
import { createAuroraConfirmation } from "../src/services/aurora-confirmation.js";
import { monadUsdc } from "../src/services/aurora-provider.js";
import {
  fundingRecipient,
  fundingOther,
  depositAddress,
  fundingHash,
  sourceAsset,
  targetAsset,
} from "./aurora-fixture.js";

const blockHash = `0x${"34".repeat(32)}`;
const value = auroraDeposit.parse({
  provider: "aurora",
  destinationChainId: 143,
  source: {
    assetId: sourceAsset,
    blockchain: "base",
    chainId: 8453,
    networkName: "Base",
    symbol: "USDC",
    decimals: 6,
    contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  destination: {
    assetId: targetAsset,
    blockchain: "monad",
    chainId: 143,
    networkName: "Monad Mainnet",
    symbol: "USDC",
    decimals: 6,
    contractAddress: monadUsdc,
  },
  recipient: fundingRecipient,
  refundAddress: fundingRecipient,
  amountIn: "1000000",
  amountOut: "995000",
  minAmountOut: "990000",
  slippageBps: 50,
  refundFee: null,
  withdrawFee: null,
  timeEstimateSeconds: 30,
  quotedAt: new Date().toISOString(),
  id: "b8984029-c957-47b1-bf44-cf4d7d7544cc",
  createdAt: new Date().toISOString(),
  depositAddress,
  deadline: new Date(Date.now() + 1200000).toISOString(),
  state: "SUCCESS",
  stateSource: "aurora",
  observedAt: new Date().toISOString(),
  destinationTxHashes: [fundingHash],
  confirmation: { state: "pending", txHash: null, blockNumber: null },
});

const verify = (
  options: {
    chainId?: string;
    recipient?: `0x${string}`;
    token?: string;
    amount?: bigint;
    head?: string;
    reorg?: boolean;
    failed?: boolean;
    outage?: boolean;
    stale?: boolean;
  } = {},
) => {
  const fetcher: typeof fetch = (_input, init) => {
    if (options.outage) throw new Error("fixture RPC outage");
    const request = z
      .object({ id: z.number(), method: z.string() })
      .parse(JSON.parse(z.string().parse(init?.body)));
    let result: unknown;
    if (request.method === "eth_chainId") result = options.chainId ?? "0x8f";
    else if (request.method === "eth_blockNumber") result = options.head ?? "0x65";
    else if (request.method === "eth_getBlockByNumber")
      result = {
        hash: options.reorg ? `0x${"56".repeat(32)}` : blockHash,
        number: "0x63",
        timestamp: `0x${(Math.floor(Date.now() / 1000) - (options.stale ? 3600 : 0)).toString(16)}`,
        transactions: [],
      };
    else if (request.method === "eth_getTransactionReceipt")
      result = {
        transactionHash: fundingHash,
        transactionIndex: "0x0",
        blockNumber: "0x63",
        blockHash,
        from: depositAddress,
        to: monadUsdc,
        cumulativeGasUsed: "0x100",
        gasUsed: "0x100",
        effectiveGasPrice: "0x1",
        contractAddress: null,
        status: options.failed ? "0x0" : "0x1",
        type: "0x2",
        logsBloom: `0x${"00".repeat(256)}`,
        logs: [
          {
            address: options.token ?? monadUsdc,
            blockNumber: "0x63",
            blockHash,
            transactionHash: fundingHash,
            transactionIndex: "0x0",
            logIndex: "0x0",
            removed: false,
            topics: encodeEventTopics({
              abi: erc20Abi,
              eventName: "Transfer",
              args: { from: depositAddress, to: options.recipient ?? fundingRecipient },
            }),
            data: encodeAbiParameters(parseAbiParameters("uint256"), [options.amount ?? 995000n]),
          },
        ],
      };
    else throw new Error("Unexpected mainnet confirmation RPC call");
    return Promise.resolve(Response.json({ jsonrpc: "2.0", id: request.id, result }));
  };
  return createAuroraConfirmation("http://mainnet-fixture.test", fetcher)(value);
};

describe("canonical mainnet wallet funding confirmation", () => {
  it("verifies the canonical USDC transfer to the intended recipient after two blocks", async () => {
    expect(await verify()).toEqual({
      state: "verified",
      txHash: fundingHash,
      blockNumber: "99",
      receivedAmount: "995000",
    });
  });
  it.each([
    { recipient: fundingOther },
    { token: depositAddress },
    { amount: 989999n },
    { head: "0x64" },
    { reorg: true },
    { failed: true },
    { stale: true },
  ] as const)(
    "rejects an altered transfer, insufficient amount, unconfirmed block or reorganization: case %#",
    async (options) => {
      expect((await verify(options)).state).toBe("pending");
    },
  );
  it.each([{ chainId: "0x279f" }, { outage: true }])(
    "never confirms through a testnet or unavailable RPC: %j",
    async (options) => {
      expect((await verify(options)).state).toBe("unavailable");
    },
  );
});
