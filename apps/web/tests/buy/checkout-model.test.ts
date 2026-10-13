import { hashPolicy, type ClientOutput, type CommissionPolicy } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { blockedByError, selectPhase, viewRecord } from "@/components/buy/checkout/model";
import { sameTerms, splitMatches, splitSentence } from "@/components/buy/checkout/split";
import { createRecord } from "@/lib/tx/records";
import type { TxRecord, TxStep } from "@/lib/tx/types";

type Preview = ClientOutput<"checkout.preview">;

const policy: CommissionPolicy = {
  rewardToken: "0x00000000000000000000000000000000000000aa",
  commissionBps: 1000,
  perSaleCap: "1000000000",
  campaignLiabilityCap: "100000000000",
  maxRewardedAncestors: 4,
  weightsBps: [5000, 2500, 1500, 1000],
  shortPathMode: "RENORMALIZE_EXISTING",
  holdSeconds: 600,
  expiry: "4102444800",
  eligibilityHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
};
const policyHash = hashPolicy(policy);

const recipient = (index: number, amount: bigint, weight: number) => ({
  nodeId: String(index + 1),
  creator: { address: null, handle: null, displayName: null, visibility: "private" as const },
  depth: index + 1,
  paid: true,
  repeatedWallet: false,
  outsideWindow: false,
  effectiveWeightBps: weight,
  amount: amount.toString(),
  state: null,
  reasonIfUnpaid: null,
});

const preview = (
  price: bigint,
  amounts: readonly bigint[],
  weights: readonly number[],
): Preview => ({
  price: price.toString(),
  recipients: amounts.map((amount, index) => recipient(index, amount, weights[index] ?? 0)),
  rewardTotal: amounts.reduce((sum, amount) => sum + amount, 0n).toString(),
  unallocated: "0",
  policyHash,
  policyVersion: 1,
  nextPolicy: null,
  directPurchaseAvailable: true,
  blockNumber: "1",
  holdSeconds: 600,
  refundPolicy: "",
  blocking: null,
});

const withHash = { ...policy, policyHash };

const purchaseRecord = (statuses: readonly [TxStep["status"], TxStep["status"]]) => {
  const record: TxRecord<"purchase"> = createRecord({
    id: "r1",
    kind: "purchase",
    params: {
      campaignId: "1",
      nodeId: "2",
      orderKey: `0x${"11".repeat(32)}`,
      price: "10000",
      productTitle: "Product",
      merchantName: "Merchant",
      intentId: null,
    },
    mode: "live",
    account: "0x00000000000000000000000000000000000000cc",
    chainId: 10143,
    now: 0,
  });
  return {
    ...record,
    steps: record.steps.map((step, index) => ({
      ...step,
      status: statuses[index] ?? step.status,
      hash: statuses[index] === "not_submitted" ? null : (`0x${"22".repeat(32)}` as const),
    })),
  };
};

describe("checkout split recomputation", () => {
  it("matches the golden vectors of the four-level policy", () => {
    expect(
      splitMatches(preview(10_000n, [500n, 250n, 150n, 100n], policy.weightsBps), withHash),
    ).toBe(true);
    expect(
      splitMatches(preview(10_010n, [501n, 250n, 150n, 100n], policy.weightsBps), withHash),
    ).toBe(true);
    expect(splitMatches(preview(10n, [1n, 0n, 0n, 0n], policy.weightsBps), withHash)).toBe(true);
  });

  it("renormalizes a two-person path to 6667/3333 and flags a one-unit mismatch", () => {
    const two = preview(10_000n, [667n, 333n], [6667, 3333]);
    expect(splitMatches(two, withHash)).toBe(true);
    expect(splitSentence(two, policy)).toEqual({ kind: "renormalized", split: [6667, 3333] });
    expect(splitMatches(preview(10_000n, [668n, 332n], [6667, 3333]), withHash)).toBe(false);
  });

  it("treats a changed amount or policy hash as changed terms", () => {
    const reviewed = preview(10_000n, [500n, 250n, 150n, 100n], policy.weightsBps);
    expect(sameTerms(reviewed, reviewed)).toBe(true);
    expect(sameTerms(reviewed, { ...reviewed, price: "10001" })).toBe(false);
    expect(sameTerms(reviewed, { ...reviewed, policyHash: `0x${"33".repeat(32)}` })).toBe(false);
  });
});

describe("checkout steps", () => {
  const none = { kind: "none" } as const;

  it("routes Buy to the first unmet step", () => {
    expect(selectPhase({ started: false, signedIn: true, fundsReady: true, record: none })).toBe(
      "review",
    );
    expect(selectPhase({ started: true, signedIn: false, fundsReady: false, record: none })).toBe(
      "account",
    );
    expect(selectPhase({ started: true, signedIn: true, fundsReady: false, record: none })).toBe(
      "funds",
    );
    expect(selectPhase({ started: true, signedIn: true, fundsReady: true, record: none })).toBe(
      "pay",
    );
  });

  it("follows the engine record and never shows Done before confirmation", () => {
    const signing = viewRecord(purchaseRecord(["done", "wallet_confirmation"]));
    const sent = viewRecord(purchaseRecord(["done", "submitted"]));
    const unknown = viewRecord(purchaseRecord(["done", "unknown"]));
    const confirmed = viewRecord(purchaseRecord(["done", "confirmed"]));
    const rejected = viewRecord(purchaseRecord(["rejected", "not_submitted"]));
    expect(signing.kind).toBe("active");
    expect(sent).toEqual({ kind: "confirming", unknown: false });
    expect(unknown).toEqual({ kind: "confirming", unknown: true });
    expect(confirmed).toEqual({ kind: "done", saleId: null, indexed: false });
    expect(rejected).toEqual({ kind: "stopped", reason: "rejected" });
    const phase = (record: ReturnType<typeof viewRecord>) =>
      selectPhase({ started: true, signedIn: true, fundsReady: true, record });
    expect([signing, sent, confirmed, rejected].map(phase)).toEqual([
      "pay",
      "confirming",
      "done",
      "pay",
    ]);
  });

  it("maps contract errors to buyer states by name before code", () => {
    expect(blockedByError("DUPLICATE_CHECKOUT", "BuyerAlreadyPurchased")).toBe("alreadyBought");
    expect(blockedByError("CAMPAIGN_NOT_ACTIVE", "ZeroReward")).toBe("zeroReward");
    expect(blockedByError("CAMPAIGN_NOT_ACTIVE", "CampaignCapacityReached")).toBe("capacity");
    expect(blockedByError("SELF_REFERRAL", null)).toBe("selfReferral");
    expect(blockedByError("INTERNAL", null)).toBeNull();
  });
});
