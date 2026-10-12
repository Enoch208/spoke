import { demoTokenAbi, spokeProtocolAbi, type CommissionPolicy } from "@spoke/protocol";
import { encodeFunctionData, isAddress, isHex } from "viem";
import type { AnyTxRecord, Hex, TxStep } from "./types";

export type ContractAddresses = { protocol: Hex; token: Hex };

export type EncodedCall = { to: Hex; data: Hex; value: 0n };

export const asAddress = (value: string): Hex => {
  if (!isAddress(value, { strict: false })) throw new TypeError(`Not an address: ${value}`);
  return value;
};

export const asBytes32 = (value: string): Hex => {
  if (!isHex(value) || value.length !== 66) throw new TypeError(`Not 32 bytes: ${value}`);
  return value;
};

export const policyStruct = (policy: CommissionPolicy) => ({
  rewardToken: asAddress(policy.rewardToken),
  commissionBps: policy.commissionBps,
  maxRewardedAncestors: policy.maxRewardedAncestors,
  weightsBps: policy.weightsBps,
  perSaleCap: BigInt(policy.perSaleCap),
  campaignLiabilityCap: BigInt(policy.campaignLiabilityCap),
  holdSeconds: BigInt(policy.holdSeconds),
  expiry: BigInt(policy.expiry),
  shortPathMode: policy.shortPathMode === "RENORMALIZE_EXISTING" ? 0 : 1,
  eligibilityHash: asBytes32(policy.eligibilityHash),
});

export class MissingContextError extends Error {
  override readonly name = "MissingContextError";
}

const contextCampaignId = (record: AnyTxRecord) => {
  const campaignId = record.context.campaignId;
  if (!campaignId) throw new MissingContextError("The campaign ID from the create step is missing");
  return BigInt(campaignId);
};

const protocolCall = (addresses: ContractAddresses, data: Hex): EncodedCall => ({
  to: addresses.protocol,
  data,
  value: 0n,
});

const tokenCall = (addresses: ContractAddresses, data: Hex): EncodedCall => ({
  to: addresses.token,
  data,
  value: 0n,
});

export const approvalAmount = (record: AnyTxRecord): bigint => {
  switch (record.kind) {
    case "createCampaign":
      return BigInt(record.params.deposit);
    case "fundCampaign":
      return BigInt(record.params.amount);
    case "purchase":
      return BigInt(record.params.price);
    default:
      return 0n;
  }
};

const targetOf = (step: TxStep) => {
  if (step.target === null) throw new MissingContextError(`Step ${step.kind} has no target`);
  return BigInt(step.target);
};

const campaignOf = (record: AnyTxRecord) =>
  "campaignId" in record.params ? BigInt(record.params.campaignId) : contextCampaignId(record);

export const encodeStep = (
  record: AnyTxRecord,
  step: TxStep,
  addresses: ContractAddresses,
): EncodedCall => {
  const call = (functionData: Hex) => protocolCall(addresses, functionData);
  switch (step.kind) {
    case "approve":
      return tokenCall(
        addresses,
        encodeFunctionData({
          abi: demoTokenAbi,
          functionName: "approve",
          args: [addresses.protocol, approvalAmount(record)],
        }),
      );
    case "mintDemoTokens":
      return tokenCall(
        addresses,
        encodeFunctionData({
          abi: demoTokenAbi,
          functionName: "faucet",
          args: [record.kind === "mintDemoTokens" ? BigInt(record.params.amount) : 0n],
        }),
      );
    case "createCampaign": {
      if (record.kind !== "createCampaign") throw new MissingContextError("Wrong record kind");
      const { metadataHash, skuHash, skuPrice, policy } = record.params;
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "createCampaign",
          args: [metadataHash, { skuHash, skuPrice: BigInt(skuPrice) }, policyStruct(policy)],
        }),
      );
    }
    case "fundCampaign":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "fundCampaign",
          args: [campaignOf(record), approvalAmount(record)],
        }),
      );
    case "activateCampaign":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "activateCampaign",
          args: [contextCampaignId(record)],
        }),
      );
    case "createNode": {
      if (record.kind !== "createNode") throw new MissingContextError("Wrong record kind");
      const { campaignId, parentNodeId, metadataHash } = record.params;
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "createNode",
          args: [BigInt(campaignId), BigInt(parentNodeId), metadataHash],
        }),
      );
    }
    case "purchase": {
      if (record.kind !== "purchase") throw new MissingContextError("Wrong record kind");
      const { campaignId, nodeId, orderKey } = record.params;
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "purchase",
          args: [BigInt(campaignId), BigInt(nodeId), orderKey],
        }),
      );
    }
    case "refund":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "refundNativeSale",
          args: [record.kind === "refund" ? BigInt(record.params.saleId) : targetOf(step)],
        }),
      );
    case "finalize":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "finalizeSale",
          args: [targetOf(step)],
        }),
      );
    case "claimRewards": {
      if (record.kind !== "claimRewards") throw new MissingContextError("Wrong record kind");
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "claimRewards",
          args: [record.params.token],
        }),
      );
    }
    case "claimProceeds":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "claimMerchantProceeds",
          args: [targetOf(step)],
        }),
      );
    case "withdrawUnused":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "refundUnusedRewardBudget",
          args: [campaignOf(record)],
        }),
      );
    case "pause":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "pauseCampaign",
          args: [campaignOf(record)],
        }),
      );
    case "resume":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "resumeCampaign",
          args: [campaignOf(record)],
        }),
      );
    case "end":
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "endCampaign",
          args: [campaignOf(record)],
        }),
      );
    case "registerPolicyVersion": {
      if (record.kind !== "registerPolicyVersion") {
        throw new MissingContextError("Wrong record kind");
      }
      const { campaignId, policy, effectiveAt } = record.params;
      return call(
        encodeFunctionData({
          abi: spokeProtocolAbi,
          functionName: "registerPolicyVersion",
          args: [
            BigInt(campaignId),
            policyStruct(policy),
            BigInt(Math.floor(Date.parse(effectiveAt) / 1000)),
          ],
        }),
      );
    }
  }
};
