import { z } from "zod";
import { auroraDeposit, auroraQuoteInput, auroraCreateInput, isoTimestamp } from "@spoke/protocol";
import { digest, type Store } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { type AuroraProvider } from "./aurora-provider.js";
import type { AuroraConfirmation } from "./aurora-confirmation.js";
import { createAuroraCatalog } from "./aurora-catalog.js";
import { confirmAuroraDeposit } from "./aurora-allocation.js";
import { createAuroraQuote, assertRequest } from "./aurora-quotes.js";

const record = z.object({
  fingerprint: z.string(),
  deposit: auroraDeposit,
  requestedDeadline: isoTimestamp.optional(),
  providerInactiveAt: isoTimestamp.optional(),
  confirmationCursor: z.number().int().nonnegative().default(0),
});
type QuoteInput = z.infer<typeof auroraQuoteInput>;

export const createAuroraService = (
  store: Store,
  provider: AuroraProvider | null,
  confirm: AuroraConfirmation,
) => {
  const config = createAuroraCatalog(provider);
  const quote = createAuroraQuote(provider, config);
  return {
    config,
    preview: async (input: QuoteInput, recipient: string) =>
      (await quote(input, recipient, true)).publicQuote,
    create: async (owner: string, recipient: string, raw: z.infer<typeof auroraCreateInput>) => {
      const input = auroraCreateInput.parse(raw);
      if (input.expectedRecipient.toLowerCase() !== recipient.toLowerCase())
        throw new ApiProblem(
          409,
          "CONFLICT",
          "The signed-in wallet changed. Preview a new funding quote.",
        );
      const fingerprint = digest(JSON.stringify({ ...input, recipient: recipient.toLowerCase() }));
      const id = input.requestId;
      return store.exclusive(
        `aurora:${id}`,
        async () => {
          const previous = await store.get("aurora-deposit", id);
          if (previous) {
            if (previous.owner !== owner)
              throw new ApiProblem(404, "NOT_FOUND", "No such wallet deposit.");
            const saved = record.parse(previous.payload);
            if (saved.fingerprint !== fingerprint)
              throw new ApiProblem(
                409,
                "CONFLICT",
                "This request ID already belongs to different funding details.",
              );
            return saved.deposit;
          }
          const { result, publicQuote, requestedDeadline } = await quote(input, recipient, false);
          const providerDeadline = result.quote.deadline;
          const sendBy = Math.min(
            Date.parse(requestedDeadline),
            Date.parse(providerDeadline ?? ""),
            Date.parse(result.quote.timeWhenInactive ?? providerDeadline ?? ""),
          );
          if (
            !result.quote.depositAddress ||
            /^0x0{40}$/.test(result.quote.depositAddress) ||
            result.quote.depositMemo ||
            !Number.isFinite(sendBy) ||
            sendBy < Date.now() + 60_000
          )
            throw new ApiProblem(
              503,
              "UPSTREAM_UNAVAILABLE",
              "Aurora did not return usable deposit instructions. Request a new quote.",
              true,
            );
          const deposit = auroraDeposit.parse({
            ...publicQuote,
            id,
            createdAt: new Date().toISOString(),
            depositAddress: result.quote.depositAddress,
            deadline: new Date(sendBy).toISOString(),
            providerDeadline,
            state: "PENDING_DEPOSIT",
            stateSource: "aurora",
            statusAvailable: true,
            observedAt: new Date().toISOString(),
            destinationTxHashes: [],
            confirmation: { state: "pending", txHash: null, blockNumber: null },
          });
          await store.put("aurora-deposit", id, owner, {
            fingerprint,
            deposit,
            requestedDeadline,
            providerInactiveAt: result.quote.timeWhenInactive,
          });
          await store.audit(owner, "wallet.fundingInstructionsCreated", id, {
            destinationChainId: 143,
          });
          return deposit;
        },
        "funding",
      );
    },
    status: async (owner: string, id: string) =>
      store.exclusive(
        `aurora-status:${id}`,
        async () => {
          const saved = record.parse((await store.require("aurora-deposit", id, owner)).payload);
          const previous = saved.deposit;
          if (
            Date.now() - Date.parse(previous.observedAt) < 5000 ||
            previous.confirmation.state === "verified" ||
            previous.state === "REFUNDED"
          )
            return previous;
          if (!provider) return { ...previous, statusAvailable: false };
          try {
            const upstream = await provider.status(previous.depositAddress);
            assertRequest(
              upstream.quoteResponse,
              {
                originAsset: previous.source.assetId,
                destinationAsset: previous.destination.assetId,
                amount: previous.amountIn,
                refundAddress: previous.refundAddress,
                slippageBps: previous.slippageBps,
              },
              previous.recipient,
              false,
            );
            if (
              upstream.quoteResponse.quote.depositAddress?.toLowerCase() !==
                previous.depositAddress.toLowerCase() ||
              upstream.quoteResponse.quote.deadline !==
                (previous.providerDeadline ?? previous.deadline) ||
              upstream.quoteResponse.quoteRequest.deadline !==
                (saved.requestedDeadline ?? previous.deadline) ||
              upstream.quoteResponse.quote.timeWhenInactive !== saved.providerInactiveAt ||
              upstream.quoteResponse.quote.minAmountOut !== previous.minAmountOut ||
              upstream.quoteResponse.quote.amountOut !== previous.amountOut ||
              upstream.quoteResponse.timestamp !== previous.quotedAt
            )
              throw new ApiProblem(
                503,
                "UPSTREAM_UNAVAILABLE",
                "Aurora returned status for a different deposit.",
                true,
              );
            const deposit = auroraDeposit.parse({
              ...previous,
              state: upstream.status,
              statusAvailable: true,
              observedAt: new Date().toISOString(),
              destinationTxHashes: upstream.swapDetails.destinationChainTxHashes.map(
                (tx) => tx.hash,
              ),
            });
            const confirmation = await confirmAuroraDeposit(
              store,
              owner,
              deposit,
              confirm,
              saved.confirmationCursor,
            );
            deposit.confirmation = auroraDeposit.shape.confirmation.parse(confirmation);
            await store.put("aurora-deposit", id, owner, {
              ...saved,
              deposit,
              confirmationCursor: confirmation.nextCursor,
            });
            return deposit;
          } catch (error) {
            if (error instanceof ApiProblem && [400, 429, 503].includes(error.status))
              return { ...previous, statusAvailable: false };
            throw error;
          }
        },
        "funding",
      ),
  };
};

export type AuroraService = ReturnType<typeof createAuroraService>;
