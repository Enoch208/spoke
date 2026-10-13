import { z } from "zod";
import { addressString, isoTimestamp, uintString } from "@spoke/protocol";
import { ApiProblem } from "../http/problem.js";

export const monadUsdc = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
export const auroraNetworks = {
  eth: { chainId: 1, networkName: "Ethereum" },
  base: { chainId: 8453, networkName: "Base" },
  arb: { chainId: 42161, networkName: "Arbitrum" },
  op: { chainId: 10, networkName: "OP Mainnet" },
  pol: { chainId: 137, networkName: "Polygon" },
  avax: { chainId: 43114, networkName: "Avalanche" },
  bsc: { chainId: 56, networkName: "BNB Chain" },
  monad: { chainId: 143, networkName: "Monad Mainnet" },
} as const;

const token = z.object({
  assetId: z.string().min(1).max(256),
  blockchain: z.string(),
  symbol: z.string().min(1).max(30),
  decimals: z.number().int().min(0).max(36),
  contractAddress: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
});
const tokens = z.object({ tokens: z.array(token).max(2000) }).transform((value) => value.tokens);
const request = z.object({
  dry: z.boolean(),
  swapType: z.literal("EXACT_INPUT"),
  depositType: z.literal("ORIGIN_CHAIN"),
  originAsset: z.string(),
  destinationAsset: z.string(),
  amount: uintString,
  slippageTolerance: z.number().int(),
  recipient: addressString,
  refundTo: addressString,
  recipientType: z.literal("DESTINATION_CHAIN"),
  refundType: z.literal("ORIGIN_CHAIN"),
  deadline: isoTimestamp.optional(),
});
export const providerQuote = z.object({
  timestamp: isoTimestamp,
  signature: z.string().min(1).max(2048),
  quoteRequest: request,
  quote: z.object({
    amountIn: uintString,
    amountOut: uintString,
    minAmountOut: uintString,
    refundFee: uintString.nullish(),
    withdrawFee: uintString.nullish(),
    timeEstimate: z.number().nonnegative(),
    depositAddress: addressString.optional(),
    depositMemo: z.string().optional(),
    deadline: isoTimestamp.optional(),
    timeWhenInactive: isoTimestamp.optional(),
  }),
});
export const providerStatus = z.object({
  status: z.enum([
    "PENDING_DEPOSIT",
    "KNOWN_DEPOSIT_TX",
    "INCOMPLETE_DEPOSIT",
    "PROCESSING",
    "SUCCESS",
    "REFUNDED",
    "FAILED",
  ]),
  quoteResponse: providerQuote,
  updatedAt: isoTimestamp,
  swapDetails: z.object({
    destinationChainTxHashes: z
      .array(z.object({ hash: z.string().regex(/^0x[\da-fA-F]{64}$/) }))
      .max(20),
  }),
});

export const createAuroraProvider = (apiKey: string, fetcher: typeof fetch = fetch) => {
  const call = async <T extends z.ZodType>(
    path: string,
    schema: T,
    body?: unknown,
    query?: Record<string, string>,
  ) => {
    const url = new URL(`https://intents-api.aurora.dev/api/${path}/${encodeURIComponent(apiKey)}`);
    if (query) url.search = new URLSearchParams(query).toString();
    let response: Response;
    try {
      response = await fetcher(url, {
        method: body === undefined ? "GET" : "POST",
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "Aurora is unreachable. Try again shortly.",
        true,
      );
    }
    if (response.status === 429)
      throw new ApiProblem(429, "RATE_LIMITED", "Aurora is busy. Try again in a minute.", true, {
        retryAfterSeconds: 60,
      });
    if (response.status === 400)
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "Aurora cannot quote this route or amount. Review your selection.",
      );
    if (!response.ok)
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "Aurora funding is temporarily unavailable.",
        true,
      );
    try {
      return schema.parse(await response.json());
    } catch {
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "Aurora returned an unexpected response. Try again shortly.",
        true,
      );
    }
  };
  return {
    tokens: () => call("tokens", tokens),
    quote: (body: z.infer<typeof request>) => call("quote", providerQuote, body),
    status: (depositAddress: string) =>
      call("status", providerStatus, undefined, { depositAddress }),
  };
};

export type AuroraProvider = ReturnType<typeof createAuroraProvider>;
