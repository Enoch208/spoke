import { describe, expect, it } from "vitest";
import { networkGrowth } from "../src/services/network-growth.js";
import type { ChainEvent } from "../src/services/evidence.js";

const event = (id: string, name: string, at: string): ChainEvent => ({
  id,
  name,
  at: new Date(at),
  chainId: 31337,
  payload: {},
  blockNumber: "10",
  blockHash: "0x" + "a".repeat(64),
  txHash: "0x" + "b".repeat(64),
  logIndex: Number(id),
});
describe("canonical network growth", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const old = event("1", "NodeCreated", "2026-08-01T00:00:00Z");
  const join = event("2", "NodeCreated", "2026-10-14T23:59:59Z");
  const buy = event("3", "NativePurchaseAccepted", "2026-10-14T23:59:59Z");
  const settle = event("4", "SaleFinalized", "2026-10-15T00:00:01Z");
  it("deduplicates and orders input while preserving the opening network size", () => {
    const growth = networkGrowth([settle, join, old, buy, join], now);
    expect(growth).toHaveLength(30);
    expect(growth[0]).toMatchObject({ totalLinks: 1, newLinks: 0 });
    expect(growth.at(-2)).toMatchObject({ totalLinks: 2, newLinks: 1, purchases: 1, finalized: 0 });
    expect(growth.at(-1)).toMatchObject({ totalLinks: 2, newLinks: 0, purchases: 0, finalized: 1 });
  });
  it("recomputes after canonical replay and distinguishes refunds from settlements", () => {
    const refund = event("5", "SaleRefunded", "2026-10-15T00:00:01Z");
    expect(networkGrowth([old, buy, refund], now).at(-1)).toMatchObject({
      totalLinks: 1,
      finalized: 0,
      refunded: 1,
    });
    expect(networkGrowth([], now).every((day) => day.totalLinks === 0 && day.purchases === 0)).toBe(
      true,
    );
  });
});
