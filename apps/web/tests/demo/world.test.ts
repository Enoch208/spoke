import { describe, expect, it } from "vitest";
import { seedWorld } from "../../src/demo/world/seed-world";
import { rewardLedgerOf } from "../../src/lib/client/demo/views/settlement";
import { campaignState } from "../../src/lib/client/demo/views/catalog";
import { nodeIndex, depthOfNode, childrenOf } from "../../src/lib/client/demo/views/graph";
import { ANCHOR } from "./harness";

const world = seedWorld(ANCHOR);
const json = (value: unknown) =>
  JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "bigint" ? item.toString() : item,
  );

describe("the seeded sample world", () => {
  it("is deterministic for a given anchor", () => {
    expect(json(seedWorld(ANCHOR))).toBe(json(world));
  });

  it("has the spec's population", () => {
    expect(world.merchants).toHaveLength(6);
    expect(world.products).toHaveLength(12);
    expect(world.campaigns).toHaveLength(9);
    expect(world.people.filter((person) => person.isDistributor)).toHaveLength(40);
    expect(world.sales).toHaveLength(200);
    expect(Math.min(...world.sales.map((sale) => sale.purchasedAt))).toBeGreaterThanOrEqual(
      ANCHOR - 90 * 86_400_000,
    );
  });

  it("labels every identifier as demo", () => {
    const ids = [
      ...world.campaigns,
      ...world.nodes,
      ...world.sales,
      ...world.products,
      ...world.merchants,
    ].map((item) => item.id);
    expect(ids.every((id) => id.startsWith("demo-"))).toBe(true);
    expect(world.nodes.every((node) => node.code.startsWith("demo-"))).toBe(true);
  });

  it("covers every campaign state", () => {
    const states = new Set(world.campaigns.map((campaign) => campaignState(campaign, ANCHOR)));
    expect([...states].sort()).toEqual([
      "CREATED_UNFUNDED",
      "ENDED",
      "EXPIRED",
      "FUNDED_ACTIVE",
      "PAUSED",
    ]);
  });

  it("keeps every reward vault balanced and never negative", () => {
    for (const campaign of world.campaigns) {
      const ledger = rewardLedgerOf(world, campaign);
      expect(ledger.available).toBeGreaterThanOrEqual(0n);
      expect(
        ledger.available +
          ledger.pendingReserved +
          ledger.vestedUnclaimed +
          ledger.rewardsClaimed +
          ledger.surplusWithdrawn,
      ).toBe(ledger.netDeposited);
    }
  });

  it("splits every referred sale's reward exactly", () => {
    for (const sale of world.sales.filter((candidate) => candidate.nodeId !== null)) {
      const reserved = sale.allocations.reduce(
        (total, allocation) => total + allocation.amount,
        0n,
      );
      expect(reserved + sale.unallocated).toBe(sale.reward);
    }
  });

  it("renormalizes a two-person path to 66.67 / 33.33", () => {
    const sale = world.sales.find(
      (candidate) => candidate.nodeId === "demo-n-1-tomas" && candidate.allocations.length === 2,
    );
    expect(sale?.allocations.map((allocation) => allocation.weightBps)).toEqual([6667, 3333]);
  });

  it("returns the unused share on a short path under return-unused", () => {
    const sale = world.sales.find((candidate) => candidate.nodeId === "demo-n-6-nnamdi");
    expect(sale?.unallocated).toBeGreaterThan(0n);
  });

  it("has a seven-level branch with a thirty-child node", () => {
    const index = nodeIndex(world);
    const depths = world.nodes
      .filter((node) => node.campaignId === "demo-c-1")
      .map((node) => depthOfNode(index, node));
    expect(Math.max(...depths)).toBe(7);
    expect(childrenOf(world, "demo-n-1-tomas")).toHaveLength(30);
  });

  it("gives the distributor persona sales in every hold state", () => {
    const mara = world.people[0]?.addresses[0];
    const mine = world.sales.filter((sale) =>
      sale.allocations.some((allocation) => allocation.owner === mara),
    );
    const atRisk = mine.filter((sale) => sale.status === "PENDING" && sale.unlockAt > ANCHOR);
    const ready = mine.filter((sale) => sale.status === "PENDING" && sale.unlockAt <= ANCHOR);
    expect(atRisk.some((sale) => sale.unlockAt - ANCHOR <= 5 * 60_000)).toBe(true);
    expect(ready.length).toBeGreaterThanOrEqual(2);
    expect(mine.some((sale) => sale.reversed)).toBe(true);
    expect(mine.some((sale) => sale.status === "REFUNDED" && !sale.reversed)).toBe(true);
  });
});
