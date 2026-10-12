import { and, eq, sql } from "drizzle-orm";
import { addressString, spokeProtocolAbi } from "@spoke/protocol";
import { z } from "zod";
import { records } from "../../db/schema.js";
import type { Store } from "../../db/store.js";
import type { ChainService } from "../chain.js";
import { policyView, wire } from "../chain.js";
import type { IndexerSource, SourceEvent } from "./source.js";

export type Projection = typeof records.$inferInsert;
const payload = (value: unknown) => z.record(z.string(), z.unknown()).parse(wire(value));
export const projectBatch = async (
  store: Store,
  chain: ChainService,
  batch: SourceEvent[],
  blockNumber: bigint,
  source: IndexerSource,
) => {
  if (!chain.address) throw new Error("Projection requires a deployed contract.");
  const contract = chain.address;
  const campaignIds = new Set<string>();
  const nodeIds = new Set<string>();
  const saleIds = new Set<string>();
  const projected: Projection[] = [];
  for (const event of batch) {
    if (typeof event.payload.campaignId === "string") campaignIds.add(event.payload.campaignId);
    if (typeof event.payload.nodeId === "string" && event.payload.nodeId !== "0")
      nodeIds.add(event.payload.nodeId);
    if (typeof event.payload.saleId === "string") saleIds.add(event.payload.saleId);
    if (event.name === "RewardClaimed" || event.name === "MerchantProceedsClaimed") {
      const campaignId = z.string().parse(event.payload.campaignId);
      const recipient = z.string().parse(event.payload.recipient ?? event.payload.merchant);
      projected.push({
        kind: "claim",
        id: event.id,
        owner: recipient.toLowerCase(),
        payload: {
          ...event.payload,
          source: event.name === "RewardClaimed" ? "REWARD" : "SALE_PROCEEDS",
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          at: event.at.toISOString(),
        },
      });
      if (event.name === "RewardClaimed") {
        const receipts = await store.db
          .select()
          .from(records)
          .where(
            and(
              eq(records.kind, "receipt"),
              sql`${records.payload}->>'campaignId' = ${campaignId}`,
              sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${records.payload}->'allocations') a WHERE lower(a->>'recipient') = ${recipient.toLowerCase()})`,
            ),
          );
        for (const receipt of receipts) saleIds.add(receipt.id);
      }
    }
  }
  for (const id of campaignIds) {
    const { campaign, rewards, proceeds, currentPolicy, scheduledPolicy } = await chain.campaign(
      id,
      blockNumber,
    );
    const owner = campaign.merchant.toLowerCase();
    const value = payload({
      campaignId: id,
      ...campaign,
      rewardLedger: rewards,
      proceedsLedger: proceeds,
      chainId: chain.chainId,
      contractAddress: contract,
      trustMode: "NATIVE_ONCHAIN",
      policy: policyView(currentPolicy),
      policyHash: currentPolicy.policyHash,
      scheduledPolicy: scheduledPolicy.version === 0 ? null : policyView(scheduledPolicy),
      indexedBlock: blockNumber,
      indexedAt: new Date().toISOString(),
      sourceEvidence: { source, contractInterface: "3.0" },
    });
    projected.push({ kind: "campaign", id, owner, payload: value });
    projected.push({
      kind: "campaign-balance-snapshot",
      id: `${id}_${blockNumber.toString()}`,
      owner,
      payload: {
        campaignId: id,
        blockNumber: blockNumber.toString(),
        rewardLedger: wire(rewards),
        proceedsLedger: wire(proceeds),
      },
    });
    const commitment = await store.get("campaign-metadata-commitment", campaign.metadataHash);
    const retainedMerchant = commitment ? await store.get("merchant", commitment.owner) : undefined;
    const retainedAddress = addressString.safeParse(retainedMerchant?.payload.address);
    const retainedOwnerVerified =
      commitment &&
      retainedMerchant?.owner === commitment.owner &&
      retainedAddress.success &&
      retainedAddress.data.toLowerCase() === owner;
    if (
      commitment &&
      ((await store.identity("wallet", owner)) === commitment.owner || retainedOwnerVerified)
    ) {
      projected.push({
        kind: "campaign-metadata",
        id,
        owner: commitment.owner,
        payload: {
          ...commitment.payload,
          metadataHash: campaign.metadataHash,
          indexedAttachment: true,
        },
      });
      const creation = batch.find(
        (event) => event.name === "CampaignCreated" && event.payload.campaignId === id,
      );
      if (creation && typeof commitment.payload.draftId === "string") {
        const draft = await store.get("draft", commitment.payload.draftId);
        if (draft?.owner === commitment.owner)
          projected.push({
            kind: "draft",
            id: draft.id,
            owner: draft.owner,
            payload: { ...draft.payload, launchTxHash: creation.txHash, launchIndexed: true },
          });
      }
    }
  }
  for (const event of batch) {
    if (event.name !== "PolicyVersionRegistered") continue;
    const campaignId = z.string().parse(event.payload.campaignId);
    const version = z.coerce.number().int().parse(event.payload.version);
    const value = await chain.client.readContract({
      address: contract,
      abi: spokeProtocolAbi,
      functionName: "getPolicyVersion",
      args: [BigInt(campaignId), version],
      blockNumber,
    });
    const owner = projected.find((row) => row.kind === "campaign" && row.id === campaignId)?.owner;
    if (!owner) throw new Error("Policy event has no campaign projection.");
    projected.push({
      kind: "policy-version",
      id: `${campaignId}_${String(version)}`,
      owner,
      payload: {
        ...policyView(value),
        campaignId,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        at: event.at.toISOString(),
      },
    });
  }
  for (const id of nodeIds) {
    const node = await chain.client.readContract({
      address: contract,
      abi: spokeProtocolAbi,
      functionName: "getNode",
      args: [BigInt(id)],
      blockNumber,
    });
    projected.push({
      kind: "node",
      id,
      owner: node.creator.toLowerCase(),
      payload: payload({ nodeId: id, ...node, indexedBlock: blockNumber }),
    });
  }
  for (const id of saleIds) {
    const [sale, allocations] = await chain.client.readContract({
      address: contract,
      abi: spokeProtocolAbi,
      functionName: "getSale",
      args: [BigInt(id)],
      blockNumber,
    });
    const allocationClaims =
      sale.status === 3
        ? await Promise.all(
            allocations.map((allocation) =>
              chain.client.readContract({
                address: contract,
                abi: spokeProtocolAbi,
                functionName: "allocationClaimed",
                args: [BigInt(id), allocation.recipient],
                blockNumber,
              }),
            ),
          )
        : allocations.map(() => false);
    projected.push({
      kind: "receipt",
      id,
      owner: sale.buyer.toLowerCase(),
      payload: payload({
        saleId: id,
        ...sale,
        allocations,
        allocationClaims,
        chainId: chain.chainId,
        contractAddress: contract,
        trustMode: "NATIVE_ONCHAIN",
        indexedBlock: blockNumber,
        indexedAt: new Date().toISOString(),
      }),
    });
    for (const [index, allocation] of allocations.entries())
      projected.push({
        kind: "allocation",
        id: `${id}_${allocation.recipient.toLowerCase()}`,
        owner: allocation.recipient.toLowerCase(),
        payload: payload({
          saleId: id,
          campaignId: sale.campaignId,
          ...allocation,
          claimed: allocationClaims[index] ?? false,
          status: sale.status,
          indexedBlock: blockNumber,
        }),
      });
  }
  return projected;
};
