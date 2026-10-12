import { describe, expect, it } from "vitest";
import { featureGateDecision } from "@/components/app/feature-gate-decision";

describe("featureGateDecision", () => {
  it("lets a live feature proceed in Live mode", () => {
    expect(featureGateDecision("live", "live")).toBe("proceed");
  });

  it("explains a demo-only feature in Live mode", () => {
    expect(featureGateDecision("live", "demo-only")).toBe("explain");
  });

  it("lets every feature proceed in Demo mode", () => {
    expect(featureGateDecision("demo", "demo-only")).toBe("proceed");
    expect(featureGateDecision("demo", "live")).toBe("proceed");
  });
});
