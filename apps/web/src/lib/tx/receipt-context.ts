import { spokeProtocolAbi } from "@spoke/protocol";
import { parseEventLogs, type Log } from "viem";
import type { TxStepKind } from "./types";

export const contextFromLogs = (
  kind: TxStepKind,
  logs: readonly Log[],
): Readonly<Record<string, string>> => {
  const events = parseEventLogs({ abi: spokeProtocolAbi, logs: [...logs] });
  for (const event of events) {
    if (kind === "createCampaign" && event.eventName === "CampaignCreated") {
      return { campaignId: event.args.campaignId.toString() };
    }
    if (kind === "createNode" && event.eventName === "NodeCreated") {
      return { nodeId: event.args.nodeId.toString() };
    }
    if (kind === "purchase" && event.eventName === "NativePurchaseAccepted") {
      return {
        saleId: event.args.saleId.toString(),
        unlockAt: event.args.unlockAt.toString(),
        rewardReserved: event.args.rewardReserved.toString(),
      };
    }
    if (kind === "registerPolicyVersion" && event.eventName === "PolicyVersionRegistered") {
      return { policyVersion: String(event.args.version) };
    }
  }
  return {};
};
