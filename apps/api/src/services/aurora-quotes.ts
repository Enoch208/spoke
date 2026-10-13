import { auroraQuote, auroraQuoteInput } from "@spoke/protocol";
import type { z } from "zod";
import { ApiProblem } from "../http/problem.js";
import { type AuroraProvider, providerQuote } from "./aurora-provider.js";
import type { createAuroraCatalog } from "./aurora-catalog.js";

type QuoteInput = z.infer<typeof auroraQuoteInput>;
type ProviderQuote = z.infer<typeof providerQuote>;
const unavailable = () =>
  new ApiProblem(503, "FEATURE_NOT_AVAILABLE", "Mainnet wallet funding is not configured yet.");

export const createAuroraQuote = (
  provider: AuroraProvider | null,
  config: ReturnType<typeof createAuroraCatalog>,
) => {
  return async (input: QuoteInput, recipient: string, dry: boolean) => {
    if (!provider) throw unavailable();
    const catalog = await config();
    const source = catalog.sources.find((asset) => asset.assetId === input.originAsset);
    const destination = catalog.destinations.find(
      (asset) => asset.assetId === input.destinationAsset,
    );
    if (!source || !destination)
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "Select a supported source asset and Monad Mainnet USDC.",
      );
    const requestedDeadline = new Date(Date.now() + 1_200_000).toISOString();
    const result = await provider.quote({
      dry,
      swapType: "EXACT_INPUT",
      depositType: "ORIGIN_CHAIN",
      originAsset: input.originAsset,
      destinationAsset: input.destinationAsset,
      amount: input.amount,
      slippageTolerance: input.slippageBps,
      recipient,
      recipientType: "DESTINATION_CHAIN",
      refundTo: input.refundAddress,
      refundType: "ORIGIN_CHAIN",
      deadline: requestedDeadline,
    });
    assertRequest(result, input, recipient, dry);
    if (result.quoteRequest.deadline !== requestedDeadline)
      throw new ApiProblem(
        503,
        "UPSTREAM_UNAVAILABLE",
        "Aurora changed the requested funding window.",
        true,
      );
    return {
      result,
      requestedDeadline,
      publicQuote: auroraQuote.parse({
        provider: "aurora",
        destinationChainId: 143,
        source,
        destination,
        recipient,
        refundAddress: input.refundAddress,
        amountIn: result.quote.amountIn,
        amountOut: result.quote.amountOut,
        minAmountOut: result.quote.minAmountOut,
        slippageBps: input.slippageBps,
        refundFee: result.quote.refundFee ?? null,
        withdrawFee: result.quote.withdrawFee ?? null,
        timeEstimateSeconds: result.quote.timeEstimate,
        quotedAt: result.timestamp,
      }),
    };
  };
};

export const assertRequest = (
  result: ProviderQuote,
  input: QuoteInput,
  recipient: string,
  dry: boolean,
) => {
  const echoed = result.quoteRequest;
  if (
    echoed.dry !== dry ||
    echoed.originAsset !== input.originAsset ||
    echoed.destinationAsset !== input.destinationAsset ||
    echoed.amount !== input.amount ||
    result.quote.amountIn !== input.amount ||
    echoed.slippageTolerance !== input.slippageBps ||
    echoed.recipient.toLowerCase() !== recipient.toLowerCase() ||
    echoed.refundTo.toLowerCase() !== input.refundAddress.toLowerCase() ||
    BigInt(result.quote.minAmountOut) <= 0n ||
    BigInt(result.quote.minAmountOut) > BigInt(result.quote.amountOut)
  )
    throw new ApiProblem(
      503,
      "UPSTREAM_UNAVAILABLE",
      "Aurora's quote does not match the requested funding details.",
      true,
    );
};
