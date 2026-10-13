import { describe, expect, it } from "vitest";
import { overallState } from "../../src/components/public/status/overall";

const health = {
  api: "ok" as const,
  database: "ok" as const,
  rpc: "ok" as const,
  indexer: { status: "ok" as const, lastBlock: "100", lagSeconds: 4 },
  chainHead: "102",
  chainId: 10143,
  protocolAddress: "0x1Fa5e94e44DB2101664C0a24dBf1e52912af3eca",
};

describe("status overall state", () => {
  it("reports an unreachable API before anything else", () => {
    expect(overallState({ health: undefined, status: undefined, healthFailed: true })).toBe(
      "apiDown",
    );
    expect(overallState({ health: undefined, status: undefined, healthFailed: false })).toBe(
      "checking",
    );
  });

  it("separates working, degraded, outage and not deployed", () => {
    expect(overallState({ health, status: undefined, healthFailed: false })).toBe("working");
    expect(
      overallState({
        health: { ...health, indexer: { ...health.indexer, lagSeconds: 45 } },
        status: undefined,
        healthFailed: false,
      }),
    ).toBe("degraded");
    expect(
      overallState({ health: { ...health, rpc: "down" }, status: undefined, healthFailed: false }),
    ).toBe("outage");
    expect(
      overallState({
        health: { ...health, protocolAddress: null },
        status: undefined,
        healthFailed: false,
      }),
    ).toBe("notDeployed");
  });
});
