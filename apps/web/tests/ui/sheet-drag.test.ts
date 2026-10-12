import { describe, expect, it } from "vitest";
import { dragOffset, shouldDismissSheet } from "../../src/components/ui/sheet-drag";

describe("shouldDismissSheet", () => {
  it("dismisses after a drag beyond 30% of the sheet height", () => {
    expect(shouldDismissSheet({ distance: 181, height: 600, velocity: 0.1 })).toBe(true);
  });

  it("springs back after a short, slow drag", () => {
    expect(shouldDismissSheet({ distance: 179, height: 600, velocity: 0.4 })).toBe(false);
  });

  it("dismisses a fast flick even when it is short", () => {
    expect(shouldDismissSheet({ distance: 40, height: 600, velocity: 0.6 })).toBe(true);
  });

  it("never dismisses an upward drag", () => {
    expect(shouldDismissSheet({ distance: -300, height: 600, velocity: -2 })).toBe(false);
  });
});

describe("dragOffset", () => {
  it("follows the finger downward", () => {
    expect(dragOffset(120)).toBe(120);
  });

  it("does not move the sheet upward past its resting position", () => {
    expect(dragOffset(-50)).toBe(0);
  });
});
