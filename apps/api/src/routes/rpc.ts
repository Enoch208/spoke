import { z } from "zod";
import { parseTransaction } from "viem";
import { boundedText } from "../http/bounded.js";
import { walletAddress, bytes32String } from "@spoke/protocol";
import { input, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";

const hex = z
  .string()
  .regex(/^0x[\da-fA-F]*$/)
  .max(131072);
const quantity = z
  .string()
  .regex(/^0x[\da-fA-F]+$/)
  .max(66);
const block = z.union([quantity, z.enum(["latest", "pending", "safe", "finalized", "earliest"])]);
const call = z.strictObject({
  from: walletAddress.optional(),
  to: walletAddress,
  data: hex.optional(),
  input: hex.optional(),
  value: quantity.optional(),
  gas: quantity.optional(),
  gasPrice: quantity.optional(),
  maxFeePerGas: quantity.optional(),
  maxPriorityFeePerGas: quantity.optional(),
});
const params = {
  eth_getBlockByNumber: z.tuple([block, z.literal(false)]),
  eth_getCode: z.tuple([walletAddress, block]),
  eth_feeHistory: z.tuple([
    quantity.refine((value) => BigInt(value) <= 20n),
    block,
    z.array(z.number().min(0).max(100)).max(10),
  ]),
  eth_chainId: z.tuple([]),
  eth_blockNumber: z.tuple([]),
  eth_gasPrice: z.tuple([]),
  eth_maxPriorityFeePerGas: z.tuple([]),
  eth_call: z.tuple([call, block]),
  eth_estimateGas: z.union([z.tuple([call]), z.tuple([call, block])]),
  eth_getBalance: z.tuple([walletAddress, block]),
  eth_getTransactionCount: z.tuple([walletAddress, block]),
  eth_sendRawTransaction: z.tuple([hex]),
  eth_getTransactionReceipt: z.tuple([bytes32String]),
  eth_getTransactionByHash: z.tuple([bytes32String]),
  eth_getLogs: z.tuple([
    z.strictObject({
      address: walletAddress,
      fromBlock: quantity,
      toBlock: quantity,
      topics: z
        .array(z.union([bytes32String, z.array(bytes32String).max(10), z.null()]))
        .max(4)
        .optional(),
    }),
  ]),
} as const;
export const rpcInput = z.strictObject({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string().max(100), z.number().int(), z.null()]),
  method: z.enum(Object.keys(params) as [keyof typeof params, ...(keyof typeof params)[]]),
  params: z.array(z.unknown()).max(4).default([]),
});
const rpcReply = z.union([
  z.object({
    jsonrpc: z.literal("2.0"),
    id: z.union([z.string(), z.number(), z.null()]),
    result: z.json(),
  }),
  z.object({
    jsonrpc: z.literal("2.0"),
    id: z.union([z.string(), z.number(), z.null()]),
    error: z.object({ code: z.number().int(), message: z.string(), data: z.json().optional() }),
  }),
]);

export const validateRpc = (request: z.infer<typeof rpcInput>, services: Services) => {
  const parsed = params[request.method].parse(request.params);
  if (request.method === "eth_getLogs") {
    const [filter] = params.eth_getLogs.parse(request.params);
    if (
      BigInt(filter.toBlock) < BigInt(filter.fromBlock) ||
      BigInt(filter.toBlock) - BigInt(filter.fromBlock) > 2000n
    )
      throw new ApiProblem(400, "VALIDATION_FAILED", "Log requests are limited to 2000 blocks.");
    if (
      ![services.chain.address?.toLowerCase(), services.chain.token?.toLowerCase()].includes(
        filter.address.toLowerCase(),
      )
    )
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Logs are limited to Spoke contracts.");
  }
  if (request.method === "eth_call" || request.method === "eth_estimateGas") {
    const candidate = call.parse(request.params[0]);
    if (
      ![services.chain.address?.toLowerCase(), services.chain.token?.toLowerCase()].includes(
        candidate.to.toLowerCase(),
      )
    )
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Contract calls are limited to Spoke contracts.");
  }
  if (request.method === "eth_sendRawTransaction") {
    const [raw] = params.eth_sendRawTransaction.parse(request.params);
    const transaction = (() => {
      try {
        return parseTransaction(raw as `0x${string}`);
      } catch {
        throw new ApiProblem(400, "VALIDATION_FAILED", "The signed transaction is invalid.");
      }
    })();
    if (
      transaction.chainId !== services.chain.chainId ||
      ![services.chain.address?.toLowerCase(), services.chain.token?.toLowerCase()].includes(
        transaction.to?.toLowerCase(),
      )
    )
      throw new ApiProblem(
        403,
        "NOT_AUTHORIZED",
        "Broadcasts are limited to Spoke transactions on the configured chain.",
      );
  }
  return parsed;
};

export const rpcRoutes = (services: Services, rpcUrl: string, fetcher: typeof fetch = fetch) => {
  const app = router();
  route(app, services, "POST", "/rpc", "public", async (c) => {
    await services.store.rate(`rpc:${c.get("ip")}`, 60, 60);
    const body = await input(c, rpcInput);
    const parsedParams = validateRpc(body, services);
    const response = await fetcher(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, params: parsedParams }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "The RPC request timed out or failed.",
        true,
      );
    });
    if (!response.ok)
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "RPC provider is temporarily unavailable.",
        true,
      );
    const raw = await boundedText(response, 2_000_000);
    let result: z.infer<typeof rpcReply>;
    try {
      result = rpcReply.parse(JSON.parse(raw));
    } catch {
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "The RPC provider returned an invalid response.",
        true,
      );
    }
    c.header("cache-control", "no-store");
    return c.json(
      "error" in result
        ? {
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: result.error.code,
              message: "The RPC provider rejected this request.",
              ...(typeof result.error.data === "string" && /^0x[\da-fA-F]*$/.test(result.error.data)
                ? { data: result.error.data }
                : {}),
            },
          }
        : { jsonrpc: "2.0", id: body.id, result: result.result },
    );
  });
  return app;
};
