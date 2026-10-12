import { describe, expect, it } from "vitest";
import { moveActive } from "@/components/ui/combobox-nav";

const options = [{ disabled: false }, { disabled: true }, { disabled: false }, { disabled: false }];

describe("moveActive", () => {
  it("starts at the first enabled option when moving down from nothing", () => {
    expect(moveActive(-1, 1, options)).toBe(0);
  });

  it("starts at the last enabled option when moving up from nothing", () => {
    expect(moveActive(-1, -1, options)).toBe(3);
  });

  it("skips disabled options", () => {
    expect(moveActive(0, 1, options)).toBe(2);
    expect(moveActive(2, -1, options)).toBe(0);
  });

  it("wraps around the ends", () => {
    expect(moveActive(3, 1, options)).toBe(0);
    expect(moveActive(0, -1, options)).toBe(3);
  });

  it("returns nothing when every option is disabled", () => {
    expect(moveActive(-1, 1, [{ disabled: true }])).toBe(-1);
  });

  it("returns nothing for an empty list", () => {
    expect(moveActive(-1, 1, [])).toBe(-1);
  });
});
