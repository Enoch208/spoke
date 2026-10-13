import { describe, expect, it } from "vitest";
import { budgetHealth, netValue, rewardCostBps } from "@/components/sell/core/overview/kpis";

describe("overview KPIs", () => {
  const settled = { value: 1_990_000_000n, rewards: 329_750_000n };

  it("derives net value and the reward cost ratio from bigint totals", () => {
    expect(netValue(settled)).toBe(1_660_250_000n);
    expect(rewardCostBps(settled)).toBe(1657);
  });

  it("shows no ratio before the first settled sale", () => {
    expect(rewardCostBps({ value: 0n, rewards: 0n })).toBeNull();
    expect(netValue({ value: 0n, rewards: 0n })).toBe(0n);
  });

  it("measures budget health over live campaigns only", () => {
    const health = budgetHealth([
      { stateKey: "live", available: 400_000_000n, rewardPerSale: 10_000_000n, alertSales: 5 },
      { stateKey: "exhausted", available: 5_000_000n, rewardPerSale: 10_000_000n, alertSales: 5 },
      { stateKey: "paused", available: 14_000_000n, rewardPerSale: 13_000_000n, alertSales: 5 },
      { stateKey: "ended", available: 120_000_000n, rewardPerSale: 5_800_000n, alertSales: 5 },
    ]);
    expect(health.available).toBe(405_000_000n);
    expect(health.lowest).toBe(0n);
    expect(health.exhausted).toBe(1);
    expect(health.liveCount).toBe(2);
  });
});
