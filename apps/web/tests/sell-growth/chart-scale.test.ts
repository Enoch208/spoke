import { describe, expect, it } from "vitest";
import { maxOf, niceTicks, ratio, shareBps } from "@/components/charts/scale";
import {
  accessOf,
  allows,
  capabilities,
  noPermissionText,
  permissionMatrix,
  roles,
} from "@/components/sell/growth/shared/roles";

describe("chart scale", () => {
  it("keeps money as bigint and only scales pixels", () => {
    expect(ratio(250_000n, 1_000_000n)).toBe(0.25);
    expect(ratio(0n, 0n)).toBe(0);
    expect(ratio(5n, 2n)).toBe(1);
    expect(maxOf([3n, 9n, 1n])).toBe(9n);
  });

  it("rounds axis ticks to clean steps that cover the peak", () => {
    expect(niceTicks(1_234_560_000n)).toEqual([0n, 500_000_000n, 1_000_000_000n, 1_500_000_000n]);
    expect(niceTicks(0n)).toEqual([0n, 1n]);
    expect(niceTicks(7n).at(-1)).toBeGreaterThanOrEqual(7n);
  });

  it("rounds shares to basis points", () => {
    expect(shareBps(1n, 3n)).toBe(3333);
    expect(shareBps(2n, 3n)).toBe(6667);
    expect(shareBps(1n, 0n)).toBe(0);
  });
});

describe("growth permission matrix", () => {
  it("covers every capability for every role", () => {
    for (const capability of capabilities)
      for (const role of roles) expect(permissionMatrix[capability][role]).toBeDefined();
  });

  it("matches the shared rules for money and danger actions", () => {
    expect(accessOf("refund", "owner")).toBe("signs");
    expect(accessOf("refund", "finance")).toBe("prepares");
    expect(allows("refund", "analyst")).toBe(false);
    expect(allows("danger", "admin")).toBe(false);
    expect(allows("export", "support")).toBe(false);
    expect(allows("developer", "developer")).toBe(true);
  });

  it("explains a missing permission with the role and action", () => {
    expect(noPermissionText("export", "support")).toBe(
      "Your role (Support) can’t export reports. Ask an owner or admin.",
    );
  });
});
