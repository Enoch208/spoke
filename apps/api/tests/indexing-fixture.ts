import { createServer } from "node:http";
import { z } from "zod";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  parseAbiParameters,
  toHex,
} from "viem";
import { spokeProtocolAbi } from "@spoke/protocol";

export const contract = "0x0000000000000000000000000000000000000041";
export const paymentToken = "0x0000000000000000000000000000000000000042";
export const buyer = "0x0000000000000000000000000000000000000043";
export const distributor = "0x0000000000000000000000000000000000000044";
export const merchant = "0x0000000000000000000000000000000000000045";
const hash = `0x${"01".repeat(32)}` as const;
const nextHash = `0x${"02".repeat(32)}` as const;
const policy = {
  rewardToken: paymentToken,
  commissionBps: 1000,
  maxRewardedAncestors: 1,
  weightsBps: [10000],
  perSaleCap: 100n,
  campaignLiabilityCap: 1000n,
  holdSeconds: 60n,
  expiry: 100000n,
  shortPathMode: 0,
  eligibilityHash: hash,
} as const;
export const fixtureRpc = async () => {
  const state = { reorg: false, failed: false, calls: 0, errors: [] as string[] };
  const server = createServer((request, response) => {
    void (async () => {
      const chunks = [];
      for await (const chunk of request)
        chunks.push(Buffer.from(z.instanceof(Buffer).parse(chunk)));
      const body = z
        .object({
          id: z.union([z.number(), z.string()]),
          method: z.string(),
          params: z.array(z.unknown()).default([]),
        })
        .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      let result: unknown = null;
      state.calls++;
      const blockHash = state.reorg ? nextHash : hash;
      if (body.method === "eth_chainId") result = "0x7a69";
      if (body.method === "eth_getCode") result = "0x6001";
      if (body.method === "eth_getBlockByNumber") {
        const requested = z.string().parse(body.params[0]);
        const number = requested === "latest" ? 10n : BigInt(requested);
        result = {
          number: toHex(number),
          hash: blockHash,
          timestamp: "0x7d0",
          parentHash: hash,
          nonce: "0x0000000000000000",
          sha3Uncles: hash,
          logsBloom: `0x${"00".repeat(256)}`,
          transactionsRoot: hash,
          stateRoot: hash,
          receiptsRoot: hash,
          miner: merchant,
          difficulty: "0x0",
          totalDifficulty: "0x0",
          extraData: "0x",
          size: "0x1",
          gasLimit: "0x1c9c380",
          gasUsed: "0x1",
          transactions: [],
          uncles: [],
          baseFeePerGas: "0x1",
        };
      }
      if (body.method === "eth_getLogs") {
        const filter = z
          .object({ address: z.string(), fromBlock: z.string(), toBlock: z.string() })
          .parse(body.params[0]);
        result =
          filter.address.toLowerCase() === contract &&
          BigInt(filter.fromBlock) <= 3n &&
          BigInt(filter.toBlock) >= 3n
            ? [
                {
                  address: contract,
                  blockNumber: "0x3",
                  blockHash,
                  transactionHash: hash,
                  transactionIndex: "0x0",
                  logIndex: "0x0",
                  removed: false,
                  topics: encodeEventTopics({
                    abi: spokeProtocolAbi,
                    eventName: "NativePurchaseAccepted",
                    args: { saleId: 1n, campaignId: 1n, buyer },
                  }),
                  data: encodeAbiParameters(
                    parseAbiParameters("uint256,bytes32,bytes32,uint32,uint256,uint256,uint64"),
                    [1n, hash, hash, 1, 100n, 10n, 1060n],
                  ),
                },
              ]
            : [];
      }
      if (body.method === "eth_call") {
        const call = z
          .object({ data: z.templateLiteral(["0x", z.string()]) })
          .parse(body.params[0]);
        const decoded = decodeFunctionData({ abi: spokeProtocolAbi, data: call.data });
        const version = { policy, policyHash: hash, version: 1, effectiveAt: 1000n };
        if (decoded.functionName === "getCampaign")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "getCampaign",
            result: {
              merchant,
              token: paymentToken,
              metadataHash: hash,
              skuHash: hash,
              skuPrice: 100n,
              createdAt: 1000n,
              endsAt: 100000n,
              active: true,
              paused: false,
              ended: false,
              nodeCount: 1n,
              saleCount: 1n,
            },
          });
        if (decoded.functionName === "getRewardLedger")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "getRewardLedger",
            result: {
              netDeposited: 1000n,
              available: 990n,
              pendingReserved: 0n,
              vestedUnclaimed: 10n,
              rewardsClaimed: 0n,
              surplusWithdrawn: 0n,
            },
          });
        if (decoded.functionName === "getPriceLedger")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "getPriceLedger",
            result: {
              received: 100n,
              proceedsPending: 0n,
              proceedsClaimable: 100n,
              proceedsClaimed: 0n,
              buyerRefunded: 0n,
            },
          });
        if (
          decoded.functionName === "getCurrentPolicy" ||
          decoded.functionName === "getPolicyVersion"
        )
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: decoded.functionName,
            result: version,
          });
        if (decoded.functionName === "getScheduledPolicy")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "getScheduledPolicy",
            result: { ...version, version: 0 },
          });
        if (decoded.functionName === "getNode")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "getNode",
            result: {
              campaignId: 1n,
              parentId: 0n,
              creator: distributor,
              metadataHash: hash,
              createdAt: 1000n,
            },
          });
        if (decoded.functionName === "getSale")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "getSale",
            result: [
              {
                campaignId: 1n,
                nodeId: 1n,
                buyer,
                orderKey: hash,
                policyHash: hash,
                policyVersion: 1,
                price: 100n,
                rewardReserved: 10n,
                purchasedAt: 1000n,
                unlockAt: 1060n,
                status: 3,
                source: 0,
              },
              [{ recipient: distributor, amount: 10n, depth: 1, effectiveWeightBps: 10000 }],
            ],
          });
        if (decoded.functionName === "allocationClaimed")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "allocationClaimed",
            result: true,
          });
        if (decoded.functionName === "saleIdForOrder")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "saleIdForOrder",
            result: 1n,
          });
        if (decoded.functionName === "totalCampaigns")
          result = encodeFunctionResult({
            abi: spokeProtocolAbi,
            functionName: "totalCampaigns",
            result: 1n,
          });
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(
          state.failed
            ? {
                jsonrpc: "2.0",
                id: body.id,
                error: { code: -32000, message: "test provider failure" },
              }
            : { jsonrpc: "2.0", id: body.id, result },
        ),
      );
    })().catch((error: unknown) => {
      state.errors.push(String(error));
      response.writeHead(500);
      response.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test RPC port unavailable.");
  return {
    state,
    url: `http://127.0.0.1:${String(address.port)}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        }),
      ),
  };
};
