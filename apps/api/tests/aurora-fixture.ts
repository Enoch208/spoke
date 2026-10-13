import { z } from "zod";
import { monadUsdc, createAuroraProvider } from "../src/services/aurora-provider.js";

export const sourceAsset = "sample-base-usdc";
export const targetAsset = "sample-monad-usdc";
export const depositAddress = "0x0000000000000000000000000000000000000061";
export const fundingRecipient = "0x0000000000000000000000000000000000000062";
export const fundingOther = "0x0000000000000000000000000000000000000063";
export const fundingHash = `0x${"12".repeat(32)}` as const;

export const auroraFixture = () => {
  const state = {
    calls: [] as string[],
    status: "PENDING_DEPOSIT",
    failed: false,
    altered: false,
    alteredDeadline: false,
    quote: {} as Record<string, unknown>,
  };
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    state.calls.push(url.pathname);
    if (state.failed)
      return Response.json({ error: "fixture provider unavailable" }, { status: 503 });
    if (url.pathname.includes("/tokens/"))
      return Response.json([
        {
          assetId: sourceAsset,
          blockchain: "base",
          symbol: "USDC",
          decimals: 6,
          contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        },
        {
          assetId: targetAsset,
          blockchain: "monad",
          symbol: "USDC",
          decimals: 6,
          contractAddress: monadUsdc,
        },
        {
          assetId: "sample-sdusd",
          blockchain: "monad",
          symbol: "SDUSD",
          decimals: 6,
          contractAddress: depositAddress,
        },
      ]);
    if (url.pathname.includes("/quote/")) {
      const request = z.record(z.string(), z.unknown()).parse(await new Request(url, init).json());
      const quote = {
        timestamp: new Date().toISOString(),
        signature: "fixture-signature",
        quoteRequest: { ...request, recipient: state.altered ? fundingOther : request.recipient },
        quote: {
          amountIn: request.amount,
          amountOut: "995000",
          minAmountOut: "990000",
          timeEstimate: 30,
          refundFee: "2000",
          withdrawFee: "1000",
          ...(request.dry
            ? {}
            : {
                depositAddress,
                deadline: state.alteredDeadline
                  ? new Date(Date.now() + 86400000).toISOString()
                  : request.deadline,
              }),
        },
      };
      if (!request.dry) state.quote = quote;
      return Response.json(quote);
    }
    if (url.pathname.includes("/status/")) {
      if (url.searchParams.get("depositAddress") !== depositAddress)
        throw new Error("Unexpected test deposit");
      return Response.json({
        status: state.status,
        quoteResponse: state.quote,
        updatedAt: new Date().toISOString(),
        swapDetails: {
          destinationChainTxHashes: state.status === "SUCCESS" ? [{ hash: fundingHash }] : [],
        },
      });
    }
    throw new Error("Unexpected Aurora fixture call");
  };
  return { state, provider: createAuroraProvider("test-public-app-key", fetcher) };
};
