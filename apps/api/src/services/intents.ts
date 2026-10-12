import { TransactionReceiptNotFoundError } from "viem";
import { checkoutIntent, spokeProtocolAbi } from "@spoke/protocol";
import type { Services } from "../types.js";
import type { StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { receiptEvidence } from "./evidence.js";

export const intentView = async (services: Services, row: StoredRecord) => {
  const { chain, store } = services;
  const original = checkoutIntent.parse(row.payload);
  const contract = await chain.ready();
  const head = await chain.client.getBlock();
  const saleId = await chain.client.readContract({
    address: contract,
    abi: spokeProtocolAbi,
    functionName: "saleIdForOrder",
    args: [BigInt(original.campaignId), original.orderKey as `0x${string}`],
    blockNumber: head.number,
  });
  let txHash = original.txHash;
  let status = original.status;
  if (saleId > 0n) {
    const [sale] = await chain.sale(saleId.toString(), head.number);
    if (
      sale.buyer.toLowerCase() !== original.buyer.toLowerCase() ||
      sale.nodeId.toString() !== original.nodeId ||
      sale.price.toString() !== original.expectedPrice ||
      sale.rewardReserved.toString() !== original.expectedReward ||
      sale.policyHash.toLowerCase() !== original.policyHash.toLowerCase()
    )
      throw new ApiProblem(
        409,
        "DUPLICATE_CHECKOUT",
        "This order key resolves to a different purchase.",
      );
    const proof = (await receiptEvidence(store, chain.chainId, saleId.toString())).find(
      (event) => event.name === "NativePurchaseAccepted",
    );
    txHash = proof?.txHash ?? txHash;
    status = "included";
  } else if (Date.parse(original.expiresAt) <= Date.now() && !txHash) status = "expired";
  if (txHash) {
    try {
      const receipt = await chain.client.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status === "reverted" && saleId === 0n) status = "failed";
      else if (receipt.status === "success" && saleId > 0n) {
        const canonical = await chain.client.getBlock({ blockNumber: receipt.blockNumber });
        status =
          canonical.hash === receipt.blockHash && head.number >= receipt.blockNumber + 2n
            ? "confirmed"
            : "included";
      }
    } catch (error) {
      if (!(error instanceof TransactionReceiptNotFoundError)) throw error;
    }
  }
  return checkoutIntent.parse({
    ...original,
    saleId: saleId > 0n ? saleId.toString() : null,
    txHash,
    status,
  });
};
