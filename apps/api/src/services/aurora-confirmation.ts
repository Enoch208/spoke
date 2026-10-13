import { createPublicClient, erc20Abi, http, parseEventLogs } from "viem";
import { monad } from "viem/chains";
import { auroraDeposit } from "@spoke/protocol";
import type { z } from "zod";
import { monadUsdc } from "./aurora-provider.js";

type Deposit = z.infer<typeof auroraDeposit>;

export const createAuroraConfirmation = (rpcUrl: string, fetcher: typeof fetch = fetch) => {
  return async (
    deposit: Deposit,
    budget: AbortSignal = AbortSignal.timeout(8000),
  ): Promise<Deposit["confirmation"] & { receivedAmount?: string }> => {
    const pending = { state: "pending", txHash: null, blockNumber: null } as const;
    if (deposit.state !== "SUCCESS") return pending;
    const client = createPublicClient({
      chain: monad,
      transport: http(rpcUrl, {
        retryCount: 0,
        timeout: 8000,
        fetchFn: (input, init) =>
          fetcher(input, {
            ...init,
            signal: AbortSignal.any([budget, ...(init?.signal ? [init.signal] : [])]),
          }),
      }),
    });
    try {
      if ((await client.getChainId()) !== 143)
        return { state: "unavailable", txHash: null, blockNumber: null };
      const head = await client.getBlockNumber();
      for (const hash of deposit.destinationTxHashes) {
        const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
        if (receipt.status !== "success" || head < receipt.blockNumber + 2n) continue;
        const block = await client.getBlock({ blockNumber: receipt.blockNumber });
        if (
          block.hash !== receipt.blockHash ||
          block.timestamp < BigInt(Math.floor(Date.parse(deposit.createdAt) / 1000))
        )
          continue;
        const amount = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs })
          .filter(
            (log) =>
              log.address.toLowerCase() === monadUsdc.toLowerCase() &&
              log.args.to.toLowerCase() === deposit.recipient.toLowerCase(),
          )
          .reduce((total, log) => total + log.args.value, 0n);
        if (amount >= BigInt(deposit.minAmountOut))
          return {
            state: "verified",
            txHash: hash,
            blockNumber: receipt.blockNumber.toString(),
            receivedAmount: amount.toString(),
          };
      }
      return pending;
    } catch {
      return { state: "unavailable", txHash: null, blockNumber: null };
    }
  };
};

export type AuroraConfirmation = ReturnType<typeof createAuroraConfirmation>;
