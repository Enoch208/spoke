import { describe, expect, it } from "vitest";
import { loadingPhase, nextLoadingChange } from "@/components/ui/loading-phase";

const startedAt = 1_000;

describe("loadingPhase", () => {
  it("shows nothing for the first 150 ms", () => {
    expect(loadingPhase({ startedAt, loadedAt: null }, startedAt + 149)).toBe("hidden");
  });

  it("shows the skeleton from 150 ms while still loading", () => {
    expect(loadingPhase({ startedAt, loadedAt: null }, startedAt + 150)).toBe("skeleton");
  });

  it("shows the slow notice after 10 s still loading", () => {
    expect(loadingPhase({ startedAt, loadedAt: null }, startedAt + 10_000)).toBe("slow");
  });

  it("skips the skeleton when data arrives within 150 ms", () => {
    expect(loadingPhase({ startedAt, loadedAt: startedAt + 120 }, startedAt + 121)).toBe("content");
  });

  it("keeps a shown skeleton for at least 300 ms", () => {
    const loadedAt = startedAt + 200;
    expect(loadingPhase({ startedAt, loadedAt }, startedAt + 449)).toBe("skeleton");
    expect(loadingPhase({ startedAt, loadedAt }, startedAt + 450)).toBe("content");
  });

  it("shows content as soon as data arrives after the minimum", () => {
    expect(loadingPhase({ startedAt, loadedAt: startedAt + 900 }, startedAt + 900)).toBe("content");
  });
});

describe("nextLoadingChange", () => {
  it("wakes at the skeleton threshold while hidden", () => {
    expect(nextLoadingChange({ startedAt, loadedAt: null }, startedAt + 10)).toBe(startedAt + 150);
  });

  it("wakes at the slow threshold while the skeleton shows", () => {
    expect(nextLoadingChange({ startedAt, loadedAt: null }, startedAt + 500)).toBe(
      startedAt + 10_000,
    );
  });

  it("wakes when the minimum display ends after data arrives", () => {
    expect(nextLoadingChange({ startedAt, loadedAt: startedAt + 200 }, startedAt + 210)).toBe(
      startedAt + 450,
    );
  });

  it("has nothing to wait for once content shows", () => {
    expect(nextLoadingChange({ startedAt, loadedAt: startedAt + 100 }, startedAt + 100)).toBeNull();
  });
});
