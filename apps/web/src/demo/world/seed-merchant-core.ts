import { zeroHash } from "viem";
import { tokens, units } from "./catalog";
import { DAY, MINUTE, iso, sampleAddress, sampleHash } from "./ids";
import type { DemoCore } from "./types";
import type { DemoWorld } from "./world";

export const seedMerchantCore = (
  core: DemoCore,
): Pick<DemoWorld, "drafts" | "intents" | "assets" | "blockedCheckouts"> => {
  const endsAt = core.anchor + 45 * DAY;
  return {
    drafts: [
      {
        merchantId: "demo-m-1",
        launchedCampaignId: null,
        draft: {
          draftId: "demo-draft-1",
          version: 3,
          savedAt: iso(core.anchor - 2 * DAY),
          stepReached: 3,
          mode: "create",
          productId: "demo-p-4",
          productVersion: 1,
          policy: {
            rewardToken: tokens.sdusd.address,
            commissionBps: 2000,
            perSaleCap: units(10).toString(),
            campaignLiabilityCap: units(300).toString(),
            maxRewardedAncestors: 3,
            weightsBps: [6000, 2500, 1500],
            shortPathMode: "RENORMALIZE_EXISTING",
            holdSeconds: 86_400,
            expiry: String(Math.floor(endsAt / 1000)),
            eligibilityHash: zeroHash,
          },
          endsAt: iso(endsAt),
          inviteOnly: false,
        },
      },
    ],
    intents: [
      {
        id: "demo-intent-0",
        campaignId: "demo-c-5",
        nodeId: "demo-n-5-priya",
        orderKey: sampleHash("order:abandoned"),
        expectedPrice: units(49).toString(),
        expectedReward: units(9, 80).toString(),
        policyHash:
          core.campaigns.find((campaign) => campaign.id === "demo-c-5")?.policies[0]?.hash ??
          zeroHash,
        chainId: 10143,
        buyer: sampleAddress("buyer:persona"),
        status: "expired",
        txHash: null,
        saleId: null,
        createdAt: iso(core.anchor - DAY),
        expiresAt: iso(core.anchor - DAY + 30 * MINUTE),
        to: sampleAddress("protocol"),
        data: "0x",
        value: "0",
      },
    ],
    assets: [],
    blockedCheckouts: [
      {
        campaignId: "demo-c-1",
        nodeId: "demo-n-1-mara",
        reason: "SELF_REFERRAL",
        at: core.anchor - 16 * DAY,
      },
      {
        campaignId: "demo-c-1",
        nodeId: "demo-n-1-mara",
        reason: "INVALID_BUYER",
        at: core.anchor - 9 * DAY,
      },
      {
        campaignId: "demo-c-4",
        nodeId: "demo-n-4-mara",
        reason: "DEPLETED_POOL",
        at: core.anchor - 2 * DAY,
      },
      {
        campaignId: "demo-c-2",
        nodeId: "demo-n-2-mara",
        reason: "CAMPAIGN_INACTIVE",
        at: core.anchor - DAY,
      },
    ],
  };
};
