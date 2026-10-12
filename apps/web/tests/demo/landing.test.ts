import { describe, expect, it } from "vitest";
import {
  demoLanding,
  exitTarget,
  internalPath,
  isPersona,
  liveEquivalent,
} from "../../src/lib/demo/landing";

describe("demo entry and exit routing", () => {
  it("lands each persona on its home unless a safe next path is given", () => {
    expect(demoLanding("merchant", null)).toBe("/sell");
    expect(demoLanding("distributor", undefined)).toBe("/earn");
    expect(demoLanding("buyer", "")).toBe("/purchases");
    expect(demoLanding("buyer", "/c/demo-c-1?node=demo-n-1-mara")).toBe(
      "/c/demo-c-1?node=demo-n-1-mara",
    );
    expect(demoLanding("merchant", "/demo")).toBe("/sell");
  });

  it("rejects next values that leave the site", () => {
    expect(internalPath("https://evil.example.com/x")).toBeNull();
    expect(internalPath("//evil.example.com")).toBeNull();
    expect(internalPath("/\\evil.example.com")).toBeNull();
    expect(internalPath("javascript:alert(1)")).toBeNull();
    expect(internalPath("/earn/links")).toBe("/earn/links");
  });

  it("maps a demo page to its live equivalent only when no demo identifier is in it", () => {
    expect(liveEquivalent("/earn/earnings")).toBe("/earn/earnings");
    expect(liveEquivalent("/sell/campaigns/demo-c-1")).toBeNull();
    expect(liveEquivalent("/receipts/demo/demo-s-17")).toBeNull();
    expect(liveEquivalent("/demo")).toBeNull();
  });

  it("exits to the live equivalent, else next, else the landing page", () => {
    expect(exitTarget("/sell/vault", "/explore")).toBe("/sell/vault");
    expect(exitTarget("/sell/campaigns/demo-c-1", "/explore")).toBe("/explore");
    expect(exitTarget("/c/demo-c-2", "/c/demo-c-2")).toBe("/");
    expect(exitTarget("/demo", null)).toBe("/");
  });

  it("recognises personas", () => {
    expect(isPersona("buyer")).toBe(true);
    expect(isPersona("browse")).toBe(false);
  });
});
