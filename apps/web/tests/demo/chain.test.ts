import { describe, expect, it } from "vitest";
import { ClientError } from "../../src/lib/client/errors";
import { tokens } from "../../src/demo/world/catalog";
import { ANCHOR, createDemoTestClient } from "./harness";

const orderKey = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
const contractError = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    if (error instanceof ClientError) return error.details?.contractError;
    throw error;
  }
  return null;
};

describe("the simulated chain", () => {
  it("runs a purchase through a link into the buyer's purchases and the sharer's at-risk earnings", async () => {
    const { client, runtime, chain } = createDemoTestClient({ persona: "distributor" });
    chain.execute("createNode", { campaignId: "demo-c-8", parentNodeId: "demo-n-8-pedro" });
    runtime.setPersona("buyer");
    chain.execute("mintDemoTokens", { amount: "9000000" });
    chain.execute("approve", { amount: "9000000" });
    const result = chain.execute("purchase", {
      campaignId: "demo-c-8",
      nodeId: "demo-n-8-mara",
      orderKey: orderKey(1),
    });
    expect(result.events).toContain("NativePurchaseAccepted");
    const purchases = await client["receipts.forBuyer"]({});
    expect(purchases.items[0]?.saleId).toBe(result.objectId);
    runtime.setPersona("distributor");
    const conversions = await client["earnings.byConversion"]({ state: "reserved" });
    expect(conversions.items.some((row) => row.saleId === result.objectId)).toBe(true);
  });

  it("refuses a referred purchase when the budget is exhausted but lets the direct purchase through", () => {
    const { chain } = createDemoTestClient({ persona: "distributor" });
    chain.execute("mintDemoTokens", { amount: "50000000" });
    chain.execute("approve", { amount: "50000000" });
    expect(
      contractError(() =>
        chain.execute("purchase", {
          campaignId: "demo-c-4",
          nodeId: "demo-n-4-jonas",
          orderKey: orderKey(2),
        }),
      ),
    ).toBe("InsufficientRewardEscrow");
    expect(
      chain.execute("purchase", { campaignId: "demo-c-4", nodeId: "0", orderKey: orderKey(4) })
        .events,
    ).toEqual(["NativePurchaseAccepted"]);
  });

  it("enforces the hold: no early finalize, no late refund", () => {
    const { chain, runtime, advance } = createDemoTestClient({ persona: "merchant" });
    const pending = runtime.world.sales.find(
      (sale) =>
        sale.campaignId === "demo-c-1" &&
        sale.status === "PENDING" &&
        sale.unlockAt > ANCHOR + 60_000,
    );
    if (!pending) throw new Error("expected a pending sale");
    expect(contractError(() => chain.execute("finalize", { saleId: pending.id }))).toBe(
      "SaleNotMature",
    );
    advance(pending.unlockAt - ANCHOR);
    expect(contractError(() => chain.execute("refund", { saleId: pending.id }))).toBe(
      "RefundWindowClosed",
    );
    expect(chain.execute("finalize", { saleId: pending.id }).events).toContain("SaleFinalized");
  });

  it("claims every claimable reward of a token once", async () => {
    const { client, chain } = createDemoTestClient({ persona: "distributor" });
    const before = await client["earnings.claimable"]({ token: tokens.sdusd.address });
    expect(BigInt(before.tokens[0]?.amount ?? "0")).toBeGreaterThan(0n);
    chain.execute("claimRewards", { token: tokens.sdusd.address });
    const after = await client["earnings.claimable"]({ token: tokens.sdusd.address });
    expect(after.tokens[0]?.amount).toBe("0");
    expect(
      contractError(() => chain.execute("claimRewards", { token: tokens.sdusd.address })),
    ).toBe("NothingToClaim");
  });

  it("refuses withdrawing unused budget from a live campaign", () => {
    const { chain } = createDemoTestClient({ persona: "merchant" });
    expect(contractError(() => chain.execute("withdrawUnused", { campaignId: "demo-c-1" }))).toBe(
      "CampaignActive",
    );
    expect(chain.execute("withdrawUnused", { campaignId: "demo-c-2" }).events).toContain(
      "SurplusReturned",
    );
  });

  it("launches a draft as a not-yet-live campaign until it is funded and activated", async () => {
    const { client, chain } = createDemoTestClient({ persona: "merchant" });
    const created = chain.execute("createCampaign", { draftId: "demo-draft-1" });
    const campaignId = created.objectId ?? "";
    expect((await client["campaigns.get"]({ campaignId })).state).toBe("CREATED_UNFUNDED");
    expect(contractError(() => chain.execute("activateCampaign", { campaignId }))).toBe(
      "CampaignNotFunded",
    );
    chain.execute("mintDemoTokens", { amount: "100000000" });
    chain.execute("approve", { amount: "100000000" });
    chain.execute("fundCampaign", { campaignId, amount: "100000000" });
    chain.execute("activateCampaign", { campaignId });
    expect((await client["campaigns.get"]({ campaignId })).state).toBe("FUNDED_ACTIVE");
  });

  it("allows one upcoming policy version with 24 hours' notice", async () => {
    const { client, chain } = createDemoTestClient({ persona: "merchant" });
    const policy = (await client["campaigns.policy"]({ campaignId: "demo-c-1" })).current;
    const next = {
      rewardToken: policy.rewardToken,
      commissionBps: 3000,
      perSaleCap: policy.perSaleCap,
      campaignLiabilityCap: policy.campaignLiabilityCap,
      maxRewardedAncestors: policy.maxRewardedAncestors,
      weightsBps: policy.weightsBps,
      shortPathMode: policy.shortPathMode,
      holdSeconds: policy.holdSeconds,
      expiry: policy.expiry,
      eligibilityHash: policy.eligibilityHash,
    };
    expect(
      contractError(() =>
        chain.execute("registerPolicyVersion", {
          campaignId: "demo-c-1",
          policy: next,
          effectiveAt: new Date(ANCHOR + 3_600_000).toISOString(),
        }),
      ),
    ).toBe("PolicyNoticeTooShort");
    chain.execute("registerPolicyVersion", {
      campaignId: "demo-c-1",
      policy: next,
      effectiveAt: new Date(ANCHOR + 2 * 86_400_000).toISOString(),
    });
    expect(
      (await client["campaigns.policy"]({ campaignId: "demo-c-1" })).scheduled?.commissionBps,
    ).toBe(3000);
    expect(
      contractError(() =>
        chain.execute("registerPolicyVersion", {
          campaignId: "demo-c-1",
          policy: next,
          effectiveAt: new Date(ANCHOR + 3 * 86_400_000).toISOString(),
        }),
      ),
    ).toBe("PolicyVersionPending");
  });

  it("replays the journal into the same world after a reload", async () => {
    let saved: unknown = null;
    const first = createDemoTestClient({
      persona: "distributor",
      onChange: (snapshot) => (saved = snapshot),
    });
    first.chain.execute("createNode", { campaignId: "demo-c-8", parentNodeId: "demo-n-8-pedro" });
    await first.client["reputation.updateVisibility"]({
      level: "pseudonymous",
      fields: [],
      acceptsInvitations: false,
    });
    first.runtime.setPersona("buyer");
    first.chain.execute("mintDemoTokens", { amount: "9000000" });
    first.chain.execute("approve", { amount: "9000000" });
    first.chain.execute("purchase", {
      campaignId: "demo-c-8",
      nodeId: "demo-n-8-mara",
      orderKey: orderKey(3),
    });
    const snapshot = first.runtime.snapshot();
    expect(saved).toEqual(snapshot);
    const second = createDemoTestClient({ snapshot });
    expect(second.runtime.restore()).toBe("restored");
    const key = (value: unknown) =>
      JSON.stringify(value, (_k, item: unknown) =>
        typeof item === "bigint" ? item.toString() : item,
      );
    expect(key(second.runtime.world.sales)).toBe(key(first.runtime.world.sales));
    expect(key(second.runtime.world.nodes)).toBe(key(first.runtime.world.nodes));
    expect(second.runtime.world.people[0]?.visibility).toBe("pseudonymous");
  });
});
