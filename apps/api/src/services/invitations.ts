import { and, eq, inArray } from "drizzle-orm";
import { records } from "../db/schema.js";
import { z } from "zod";
import { formatTokenAmount, invitation, spokeProtocolAbi, walletAddress } from "@spoke/protocol";
import { present, type StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";

const formatBps = (value: number) => `${(value / 100).toFixed(2).replace(/\.00$/, "")}%`;

export const invitationView = (row: StoredRecord) =>
  invitation.parse({
    ...present(row),
    status:
      row.payload.status === "pending" && Date.parse(String(row.payload.expiresAt)) <= Date.now()
        ? "expired"
        : row.payload.status,
  });

export const activeInvitationCampaign = async (services: Services, campaignId: string) => {
  const fresh = await services.chain.campaign(campaignId);
  if (
    fresh.campaign.ended ||
    fresh.campaign.paused ||
    !fresh.campaign.active ||
    fresh.campaign.endsAt * 1000n <= BigInt(Date.now())
  )
    throw new ApiProblem(
      409,
      "CAMPAIGN_NOT_ACTIVE",
      "This campaign is not accepting invitations or new links right now.",
    );
  return fresh;
};

export const invitationTerms = async (
  services: Services,
  fresh: Awaited<ReturnType<typeof activeInvitationCampaign>>,
) => {
  const policy = fresh.currentPolicy.policy;
  const token = (await services.chain.tokenInfo()).find(
    (item) => item.address.toLowerCase() === policy.rewardToken.toLowerCase(),
  );
  if (!token)
    throw new ApiProblem(
      503,
      "UPSTREAM_UNAVAILABLE",
      "The campaign reward token could not be verified.",
      true,
    );
  return `${formatBps(policy.commissionBps)} of each sale, up to ${formatTokenAmount(policy.perSaleCap, token.decimals)} ${token.symbol} (testnet), split ${policy.weightsBps.map(formatBps).join(" / ")} nearest first, ${policy.holdSeconds.toString()} seconds before settlement. Rewards come from the merchant's funded budget, only after a real sale settles.`;
};

export const assertInvitationRecipient = async (
  services: Services,
  distributor: string,
  campaignId: string,
  accountId: string,
) => {
  const recipient = await services.store.identity("wallet", distributor.toLowerCase());
  const account = recipient ? await services.store.get("account", recipient) : undefined;
  if (recipient === accountId)
    throw new ApiProblem(400, "VALIDATION_FAILED", "You cannot invite your own account.");
  if (
    !recipient ||
    z.object({ acceptsInvitations: z.boolean() }).safeParse(account?.payload.visibility).data
      ?.acceptsInvitations !== true
  )
    throw new ApiProblem(403, "NOT_ELIGIBLE", "This distributor has not enabled invitations.");
  const node = await services.chain.client.readContract({
    address: await services.chain.ready(),
    abi: spokeProtocolAbi,
    functionName: "nodeOf",
    args: [BigInt(campaignId), walletAddress.parse(distributor)],
  });
  if (node > 0n)
    throw new ApiProblem(409, "CONFLICT", "This distributor already has a link in this campaign.");
  return recipient;
};

export const invitationProgress = async (services: Services, rows: StoredRecord[]) => {
  if (!rows.length) return [];
  const wallets = rows.map((row) => z.string().parse(row.payload.distributor).toLowerCase());
  const nodes = await services.store.db
    .select()
    .from(records)
    .where(and(eq(records.kind, "node"), inArray(records.owner, wallets)));
  return rows.map((row) => ({
    ...invitationView(row),
    joinedNodeId:
      nodes.find(
        (node) =>
          node.owner === String(row.payload.distributor).toLowerCase() &&
          node.payload.campaignId === row.payload.campaignId,
      )?.id ?? null,
  }));
};
