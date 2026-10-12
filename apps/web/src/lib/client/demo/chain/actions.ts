import {
  addressString,
  bytes32String,
  commissionPolicy,
  isoTimestamp,
  protocolId,
  uintString,
} from "@spoke/protocol";
import { z } from "zod";

const campaign = z.object({ campaignId: protocolId });

export const chainActionSchemas = {
  approve: z.object({ token: addressString.optional(), amount: uintString }),
  mintDemoTokens: z.object({ amount: uintString }),
  createCampaign: z.object({ draftId: z.string().min(1).max(100) }),
  fundCampaign: campaign.extend({ amount: uintString }),
  activateCampaign: campaign,
  pause: campaign,
  resume: campaign,
  end: campaign,
  withdrawUnused: campaign,
  claimProceeds: campaign,
  registerPolicyVersion: campaign.extend({ policy: commissionPolicy, effectiveAt: isoTimestamp }),
  createNode: campaign.extend({ parentNodeId: protocolId, metadataHash: bytes32String.optional() }),
  purchase: campaign.extend({ nodeId: protocolId, orderKey: bytes32String }),
  refund: z.object({ saleId: protocolId }),
  finalize: z.object({ saleId: protocolId }),
  claimRewards: z.object({ token: addressString }),
} as const;

export type ChainActionName = keyof typeof chainActionSchemas;
export type ChainActionInput<A extends ChainActionName> = z.input<(typeof chainActionSchemas)[A]>;
export type ChainActionArgs<A extends ChainActionName> = z.output<(typeof chainActionSchemas)[A]>;

export interface DemoTxResult {
  hash: `0x${string}`;
  blockNumber: string;
  at: string;
  events: string[];
  objectId: string | null;
}

export const isChainAction = (name: string): name is ChainActionName =>
  Object.hasOwn(chainActionSchemas, name);
