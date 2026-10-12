import { describe, expect, it } from "vitest";
import { remainingAfterRun, visibleToasts } from "@/components/app/toaster-logic";

const entry = (key: string) => ({ key });

describe("visibleToasts", () => {
  const entries = ["a", "b", "c", "d", "e"].map(entry);

  it("shows the three newest on desktop with the newest last", () => {
    expect(visibleToasts(entries, false).items.map((item) => item.key)).toEqual(["c", "d", "e"]);
  });

  it("shows only the newest on phone with the total count", () => {
    const visible = visibleToasts(entries, true);
    expect(visible.items.map((item) => item.key)).toEqual(["e"]);
    expect(visible.count).toBe(5);
  });

  it("shows everything when there are fewer than the limit", () => {
    expect(visibleToasts([entry("a")], false).items).toHaveLength(1);
  });

  it("shows nothing for an empty stack", () => {
    expect(visibleToasts([], true)).toEqual({ items: [], count: 0 });
  });
});

describe("remainingAfterRun", () => {
  it("subtracts the time the timer ran", () => {
    expect(remainingAfterRun(4000, 1000, 2500)).toBe(2500);
  });

  it("never goes below zero", () => {
    expect(remainingAfterRun(1000, 0, 5000)).toBe(0);
  });
});
