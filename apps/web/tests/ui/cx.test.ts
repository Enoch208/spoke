import { describe, expect, it } from "vitest";
import { cx } from "../../src/components/ui/cx";

describe("cx", () => {
  it("joins the class names that are set", () => {
    expect(cx("a", false, "b", null, undefined, "", "c")).toBe("a b c");
  });

  it("returns an empty string when nothing is set", () => {
    expect(cx(false, null)).toBe("");
  });
});
