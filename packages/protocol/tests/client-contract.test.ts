import { describe, expect, it } from "vitest";
import { decodeFunctionData, encodeFunctionData } from "viem";
import {
  clientMethodSchemas,
  commissionPolicy,
  contractErrorCodes,
  earningsBuckets,
  spokeProtocolAbi,
  txStates,
  uintString,
} from "../src/index.js";

const token = "0x0000000000000000000000000000000000000001";
const hash = `0x${"ab".repeat(32)}` as const;
const policy = {
  rewardToken: token,
  commissionBps: 1000,
  perSaleCap: "1000000",
  campaignLiabilityCap: "100000000",
  maxRewardedAncestors: 4,
  weightsBps: [5000, 2500, 1500, 1000],
  holdSeconds: 600,
  expiry: "2000000000",
  eligibilityHash: hash,
};

describe("v3 client and contract boundaries", () => {
  it("encodes a direct purchase and preserves the client's order key", () => {
    const input = clientMethodSchemas["checkout.createIntent"].input.parse({
      campaignId: "1",
      orderKey: hash,
      expectedPrice: "100",
      expectedReward: "0",
      policyHash: hash,
      chainId: 10143,
    });
    expect(input.nodeId).toBe("0");
    const data = encodeFunctionData({
      abi: spokeProtocolAbi,
      functionName: "purchase",
      args: [BigInt(input.campaignId), BigInt(input.nodeId), hash],
    });
    expect(decodeFunctionData({ abi: spokeProtocolAbi, data })).toEqual({
      functionName: "purchase",
      args: [1n, 0n, hash],
    });
    expect(
      clientMethodSchemas["checkout.createIntent"].input.safeParse({
        ...input,
        orderKey: undefined,
      }).success,
    ).toBe(false);
  });

  it("encodes node creation with its immutable metadata hash", () => {
    const data = encodeFunctionData({
      abi: spokeProtocolAbi,
      functionName: "createNode",
      args: [1n, 2n, hash],
    });
    expect(decodeFunctionData({ abi: spokeProtocolAbi, data })).toEqual({
      functionName: "createNode",
      args: [1n, 2n, hash],
    });
    expect(
      spokeProtocolAbi.find(
        (item) => item.type === "function" && item.name === "refundUnusedRewardBudget",
      )?.inputs,
    ).toHaveLength(1);
  });

  it("exposes every protocol and faucet error through the typed error catalogue", () => {
    for (const entry of spokeProtocolAbi)
      if (entry.type === "error") expect(Object.hasOwn(contractErrorCodes, entry.name)).toBe(true);
    expect(contractErrorCodes.CampaignActive).toBe("VALIDATION_FAILED");
    expect(contractErrorCodes.PolicyVersionPending).toBe("VALIDATION_FAILED");
    expect(contractErrorCodes.FaucetLimitExceeded).toBe("VALIDATION_FAILED");
  });

  it("rejects malformed and overflowing money without throwing from validation", () => {
    for (const value of ["", "abc", "01", "-1", "1.2", "1e3", (2n ** 256n).toString(), 1]) {
      expect(uintString.safeParse(value).success).toBe(false);
      expect(commissionPolicy.safeParse({ ...policy, perSaleCap: value }).success).toBe(false);
    }
    expect(uintString.parse((2n ** 256n - 1n).toString())).toBe((2n ** 256n - 1n).toString());
  });

  it("validates future-terms drafts without introducing scheduled launches", () => {
    const draft = {
      mode: "newVersion",
      campaignId: "1",
      policy,
      endsAt: "2030-01-01T00:00:00Z",
      effectiveAt: "2029-12-15T00:00:00Z",
      stepReached: 4,
      version: 0,
    };
    expect(
      clientMethodSchemas["campaigns.saveDraft"].input.safeParse({ id: "terms", draft }).success,
    ).toBe(true);
    expect(
      clientMethodSchemas["campaigns.saveDraft"].input.safeParse({
        id: "terms",
        draft: { ...draft, effectiveAt: undefined },
      }).success,
    ).toBe(false);
    expect(
      clientMethodSchemas["campaigns.saveDraft"].input.safeParse({
        id: "terms",
        draft: { ...draft, startsAt: "2029-12-01T00:00:00Z" },
      }).success,
    ).toBe(false);
  });

  it("accepts the reviewed commission and hold boundaries", () => {
    expect(
      commissionPolicy.safeParse({ ...policy, commissionBps: 1, holdSeconds: 60 }).success,
    ).toBe(true);
    expect(
      commissionPolicy.safeParse({ ...policy, commissionBps: 10000, holdSeconds: 7776000 }).success,
    ).toBe(true);
    for (const invalid of [
      { commissionBps: 0 },
      { commissionBps: 10001 },
      { holdSeconds: 59 },
      { holdSeconds: 7776001 },
    ])
      expect(commissionPolicy.safeParse({ ...policy, ...invalid }).success).toBe(false);
  });

  it("keeps sensitive confirmations, visibility and abuse context in the seam", () => {
    expect(
      clientMethodSchemas["account.deleteAccount"].input.safeParse({
        confirmationToken: "a".repeat(64),
        typedConfirmation: "delete my account",
      }).success,
    ).toBe(true);
    expect(
      clientMethodSchemas["reputation.updateVisibility"].input.safeParse({
        level: "pseudonymous",
        fields: ["settledConversions"],
      }).success,
    ).toBe(false);
    expect(
      clientMethodSchemas["support.report"].input.safeParse({
        category: "abuse",
        message: "A report with enough detail to investigate.",
        context: { page: "/campaigns/1", campaignId: "1" },
      }).success,
    ).toBe(true);
    expect(
      clientMethodSchemas["campaigns.updateSettings"].input.safeParse({
        campaignId: "1",
        budgetAlertSales: 0,
      }).success,
    ).toBe(false);
  });

  it("keeps demo-only contracts typed and distinct from core availability", () => {
    expect(clientMethodSchemas["webhooks.create"].release).toBe("demo-only");
    expect(clientMethodSchemas["reputation.exportCredential"].release).toBe("demo-only");
    expect(clientMethodSchemas["campaigns.prepareCreate"].release).toBe("core");
    expect(earningsBuckets).toEqual([
      "atRisk",
      "readyToFinalize",
      "claimable",
      "claimed",
      "refunded",
      "reversed",
    ]);
    expect(txStates).toEqual(expect.arrayContaining(["done", "rejected", "unknown", "replaced"]));
    expect(txStates).not.toContain("action_available");
  });
});
