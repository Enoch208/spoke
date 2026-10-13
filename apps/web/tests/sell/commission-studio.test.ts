import { simulatePolicy, type CommissionPolicy } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { buildPolicy } from "@/components/sell/core/studio/policy";
import { referenceVectors } from "@/components/sell/core/studio/reference";
import { compareSimulations, splitPreview } from "@/components/sell/core/studio/split";
import { defaultTerms, parsedBps, type StudioTerms } from "@/components/sell/core/studio/terms";
import { checkTerms } from "@/components/sell/core/studio/validate";
import { editWeight, presetWeights, stepWeight } from "@/components/sell/core/studio/weights";

const token = {
  symbol: "SDUSD",
  decimals: 6,
  address: "0x1111111111111111111111111111111111111111",
};
const price = 40_000_000n;

const policyFor = (terms: StudioTerms): CommissionPolicy => {
  const check = checkTerms(terms, { priceMinor: price, token, variant: "campaign" });
  if (!check.resolved) throw new Error("terms should resolve");
  const policy = buildPolicy(check.resolved, terms.shortPathMode, {
    rewardToken: token.address,
    liabilityMinor: 100_000_000n,
    expiry: 2_000_000_000n,
  });
  if (!policy) throw new Error("policy should build");
  return policy;
};

const worked: StudioTerms = { ...defaultTerms, rate: "10", cap: { mode: "fixed", text: "5" } };

const amounts = (policy: CommissionPolicy, length: number) =>
  splitPreview(price, policy, length).amounts.map(String);

describe("commission studio math", () => {
  it("computes the golden vectors with the protocol functions", () => {
    const vectors = referenceVectors();
    expect(vectors.map((vector) => vector.actual)).toEqual([
      "500/250/150/100",
      "501/250/150/100",
      "1/0/0/0",
      "6667/3333",
    ]);
    expect(vectors.every((vector) => vector.actual === vector.expected)).toBe(true);
  });

  it("previews the worked example under renormalize", () => {
    const policy = policyFor(worked);
    expect(splitPreview(price, policy, 4).reward).toBe(4_000_000n);
    expect(amounts(policy, 1)).toEqual(["4000000"]);
    expect(amounts(policy, 2)).toEqual(["2666800", "1333200"]);
    expect(amounts(policy, 4)).toEqual(["2000000", "1000000", "600000", "400000"]);
  });

  it("previews the worked example when unused shares return", () => {
    const policy = policyFor({ ...worked, shortPathMode: "RETURN_UNUSED" });
    expect(amounts(policy, 1)).toEqual(["2000000"]);
    expect(splitPreview(price, policy, 1).returned).toBe(2_000_000n);
    expect(amounts(policy, 2)).toEqual(["2000000", "1000000"]);
    expect(splitPreview(price, policy, 2).returned).toBe(1_000_000n);
    expect(splitPreview(price, policy, 4).returned).toBe(0n);
  });

  it("matches the server simulation bigint for bigint and flags a mismatch", () => {
    const policy = policyFor(worked);
    const simulations = [1, 2, 4].map((pathLength) => {
      const split = simulatePolicy(price, policy, pathLength);
      return {
        pathLength,
        weightsBps: split.weightsBps,
        amounts: split.amounts.map(String),
        reserved: split.reserved.toString(),
        unallocated: split.unallocated.toString(),
      };
    });
    const server = { policyHash: `0x${"0".repeat(64)}`, simulations };
    expect(compareSimulations(price, policy, server).kind).toBe("match");
    const tampered = simulations.map((simulation, index) =>
      index === 1 ? { ...simulation, amounts: ["2666700", "1333300"] } : simulation,
    );
    expect(compareSimulations(price, policy, { ...server, simulations: tampered }).kind).toBe(
      "mismatch",
    );
  });

  it("never lets the total drift from 10,000 bps while keep total is on", () => {
    let weights: readonly string[] = presetWeights("nearestHeavy", 5);
    let seed = 7;
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed;
    };
    for (let round = 0; round < 500; round += 1) {
      const index = 1 + (random() % 4);
      const result =
        round % 2 === 0
          ? editWeight(weights, index, String((random() % 6_000) / 100), true)
          : stepWeight(weights, index, random() % 2 === 0 ? 100 : -1, true);
      if (result.ok) weights = result.weights;
      const values = parsedBps(weights);
      if (values) expect(values.reduce((sum, value) => sum + value, 0)).toBe(10_000);
    }
  });

  it("refuses an edit that would push Level 1 below 0.01%", () => {
    const weights = presetWeights("nearestHeavy", 4);
    expect(editWeight(weights, 1, "90", true)).toEqual({ ok: false, refused: "levelOneFloor" });
  });

  it("words weight totals and rate limits the way the builder speaks", () => {
    const over = checkTerms(
      { ...worked, keepTotal: false, weights: ["50", "40", "15", "10"] },
      { priceMinor: price, token, variant: "campaign" },
    );
    expect(over.errors.weights).toBe(
      "Weights must total exactly 100.00%. Now 115.00% (15.00% over).",
    );
    expect(over.pricing?.rewardMinor).toBe(4_000_000n);
    const rate = checkTerms(
      { ...worked, rate: "1.234" },
      { priceMinor: price, token, variant: "campaign" },
    );
    expect(rate.errors.rate).toBe("Use at most two decimal places.");
    const zero = checkTerms(
      { ...worked, rate: "0.01", cap: { mode: "formula" } },
      { priceMinor: 99n, token, variant: "campaign" },
    );
    expect(zero.errors.reward).toBe(
      "This price and rate give a reward of 0. Raise the rate or the cap.",
    );
  });
});
