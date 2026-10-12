import { demoTokenAbi, onchainSaleStatus, spokeProtocolAbi } from "@spoke/protocol";
import { TransactionReceiptNotFoundError, type PublicClient, type TransactionReceipt } from "viem";
import { approvalAmount, type ContractAddresses } from "./calls";
import { decodeRevertName, findRevertData } from "./errors";
import type { ChainReader, ReceiptLite } from "./ports";
import type { AnyTxRecord, Hex, TxStep } from "./types";

const lite = (receipt: TransactionReceipt): ReceiptLite => ({
  status: receipt.status,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed,
  effectiveGasPrice: receipt.effectiveGasPrice,
  logs: receipt.logs,
});

const saleStatusIndex = (name: (typeof onchainSaleStatus)[number]) =>
  onchainSaleStatus.indexOf(name);

const campaignIdOf = (record: AnyTxRecord): bigint | null => {
  if ("campaignId" in record.params) return BigInt(record.params.campaignId);
  const fromContext = record.context.campaignId;
  return fromContext ? BigInt(fromContext) : null;
};

export const createChainReader = (
  client: PublicClient,
  addresses: ContractAddresses,
): ChainReader => {
  const protocol = { address: addresses.protocol, abi: spokeProtocolAbi } as const;
  const saleStatus = async (saleId: bigint) => {
    const [sale] = await client.readContract({
      ...protocol,
      functionName: "getSale",
      args: [saleId],
    });
    return sale.status;
  };
  const campaign = (campaignId: bigint) =>
    client.readContract({ ...protocol, functionName: "getCampaign", args: [campaignId] });

  const alreadyDone = async (record: AnyTxRecord, step: TxStep): Promise<boolean | null> => {
    const account: Hex = record.account;
    const campaignId = campaignIdOf(record);
    switch (step.kind) {
      case "approve":
      case "mintDemoTokens":
        return false;
      case "createCampaign":
        return record.context.campaignId !== undefined;
      case "fundCampaign": {
        if (record.kind !== "createCampaign" || campaignId === null) return null;
        const ledger = await client.readContract({
          ...protocol,
          functionName: "getRewardLedger",
          args: [campaignId],
        });
        return ledger.netDeposited >= approvalAmount(record);
      }
      case "activateCampaign":
        return campaignId === null ? null : (await campaign(campaignId)).active;
      case "createNode":
        return campaignId === null
          ? null
          : (await client.readContract({
              ...protocol,
              functionName: "nodeOf",
              args: [campaignId, account],
            })) !== 0n;
      case "purchase":
        return record.kind !== "purchase" || campaignId === null
          ? null
          : (await client.readContract({
              ...protocol,
              functionName: "saleIdForOrder",
              args: [campaignId, record.params.orderKey],
            })) !== 0n;
      case "refund":
        return record.kind !== "refund"
          ? null
          : (await saleStatus(BigInt(record.params.saleId))) === saleStatusIndex("REFUNDED");
      case "finalize":
        return step.target === null
          ? null
          : (await saleStatus(BigInt(step.target))) === saleStatusIndex("FINALIZED");
      case "claimRewards":
        return record.kind !== "claimRewards"
          ? null
          : (await client.readContract({
              ...protocol,
              functionName: "claimableRewards",
              args: [record.params.token, account],
            })) === 0n;
      case "claimProceeds": {
        if (step.target === null) return null;
        const [, price] = await client.readContract({
          ...protocol,
          functionName: "claimableOf",
          args: [BigInt(step.target), account],
        });
        return price === 0n;
      }
      case "withdrawUnused":
        return campaignId === null
          ? null
          : (
              await client.readContract({
                ...protocol,
                functionName: "getRewardLedger",
                args: [campaignId],
              })
            ).available === 0n;
      case "pause":
        return campaignId === null ? null : (await campaign(campaignId)).paused;
      case "resume": {
        if (campaignId === null) return null;
        const state = await campaign(campaignId);
        return state.active && !state.paused;
      }
      case "end":
        return campaignId === null ? null : (await campaign(campaignId)).ended;
      case "registerPolicyVersion": {
        if (record.kind !== "registerPolicyVersion" || campaignId === null) return null;
        const scheduled = await client.readContract({
          ...protocol,
          functionName: "getScheduledPolicy",
          args: [campaignId],
        });
        return scheduled.policyHash.toLowerCase() === record.params.policyHash.toLowerCase();
      }
    }
  };

  return {
    estimateGas: (request) =>
      client.estimateGas({
        account: request.account,
        to: request.to,
        data: request.data,
        value: request.value,
      }),
    estimateFees: async () => {
      const fees = await client.estimateFeesPerGas();
      return { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };
    },
    nativeBalance: (address) => client.getBalance({ address }),
    tokenBalance: (address) =>
      client.readContract({
        address: addresses.token,
        abi: demoTokenAbi,
        functionName: "balanceOf",
        args: [address],
      }),
    allowance: (owner) =>
      client.readContract({
        address: addresses.token,
        abi: demoTokenAbi,
        functionName: "allowance",
        args: [owner, addresses.protocol],
      }),
    waitForReceipt: async (hash, options) =>
      lite(
        await client.waitForTransactionReceipt({
          hash,
          timeout: options.timeoutMs,
          onReplaced: (replacement) => {
            options.onReplaced({ reason: replacement.reason, hash: replacement.transaction.hash });
          },
        }),
      ),
    getReceipt: async (hash) => {
      try {
        return lite(await client.getTransactionReceipt({ hash }));
      } catch (error) {
        if (error instanceof TransactionReceiptNotFoundError) return null;
        throw error;
      }
    },
    transactionNonce: async (hash) => {
      try {
        return (await client.getTransaction({ hash })).nonce;
      } catch {
        return null;
      }
    },
    finalizedBlock: async () => (await client.getBlock({ blockTag: "finalized" })).number,
    confirmedNonce: (address) => client.getTransactionCount({ address, blockTag: "latest" }),
    revertName: async (request, blockNumber) => {
      try {
        await client.call({
          account: request.account,
          to: request.to,
          data: request.data,
          value: request.value,
          blockNumber,
        });
        return null;
      } catch (error) {
        const data = findRevertData(error);
        return data ? decodeRevertName(data) : null;
      }
    },
    alreadyDone,
  };
};
