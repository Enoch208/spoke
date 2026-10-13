import { z } from "zod";
import { addressString, isoTimestamp, uintString } from "./common";

export const auroraAsset = z.object({
  assetId: z.string().min(1).max(256),
  blockchain: z.string().min(1).max(40),
  networkName: z.string().min(1).max(60),
  chainId: z.number().int().positive(),
  symbol: z.string().min(1).max(30),
  decimals: z.number().int().min(0).max(36),
  contractAddress: addressString.nullable(),
});

export const auroraConfig = z.object({
  provider: z.literal("aurora"),
  configured: z.boolean(),
  destinationChainId: z.literal(143),
  destinationNetwork: z.literal("Monad Mainnet"),
  sources: z.array(auroraAsset),
  destinations: z.array(auroraAsset),
});

export const auroraQuoteInput = z.strictObject({
  originAsset: z.string().min(1).max(256),
  destinationAsset: z.string().min(1).max(256),
  amount: uintString.refine((value) => BigInt(value) > 0n, "Enter a positive amount."),
  refundAddress: addressString.refine(
    (value) => !/^0x0{40}$/.test(value),
    "Enter a nonzero refund address.",
  ),
  slippageBps: z.number().int().min(10).max(300).default(50),
});

export const auroraQuote = z.object({
  provider: z.literal("aurora"),
  destinationChainId: z.literal(143),
  source: auroraAsset,
  destination: auroraAsset,
  recipient: addressString,
  refundAddress: addressString,
  amountIn: uintString,
  amountOut: uintString,
  minAmountOut: uintString,
  slippageBps: z.number().int(),
  refundFee: uintString.nullable(),
  withdrawFee: uintString.nullable(),
  timeEstimateSeconds: z.number().nonnegative(),
  quotedAt: isoTimestamp,
});

export const auroraCreateInput = auroraQuoteInput.extend({
  requestId: z.uuid(),
  acknowledgeMainnet: z.literal(true),
  expectedRecipient: addressString,
});

export const auroraSwapState = z.enum([
  "PENDING_DEPOSIT",
  "KNOWN_DEPOSIT_TX",
  "INCOMPLETE_DEPOSIT",
  "PROCESSING",
  "SUCCESS",
  "REFUNDED",
  "FAILED",
]);

export const auroraDeposit = auroraQuote.extend({
  id: z.uuid(),
  createdAt: isoTimestamp,
  depositAddress: addressString,
  deadline: isoTimestamp,
  providerDeadline: isoTimestamp.optional(),
  state: auroraSwapState,
  stateSource: z.literal("aurora"),
  statusAvailable: z.boolean().default(true),
  observedAt: isoTimestamp,
  destinationTxHashes: z.array(z.string().regex(/^0x[\da-fA-F]{64}$/)),
  confirmation: z.object({
    state: z.enum(["pending", "verified", "unavailable"]),
    txHash: z
      .string()
      .regex(/^0x[\da-fA-F]{64}$/)
      .nullable(),
    blockNumber: uintString.nullable(),
  }),
});
