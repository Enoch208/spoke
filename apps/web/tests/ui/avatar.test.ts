import { describe, expect, it } from "vitest";
import { avatarFills, avatarFor, avatarInitial } from "@/components/ui/avatar-style";

describe("avatarFor", () => {
  it("gives the same seed the same fill every time", () => {
    expect(avatarFor("0x6e54aa0000000000000000000000000000093f1")).toBe(
      avatarFor("0x6e54aa0000000000000000000000000000093f1"),
    );
  });

  it("spreads different seeds across the palette", () => {
    const seeds = Array.from({ length: 40 }, (_, index) => `seed-${String(index)}`);
    const used = new Set(seeds.map(avatarFor));
    expect(used.size).toBe(avatarFills.length);
  });
});

describe("avatarInitial", () => {
  it("uses the first letter of the name", () => {
    expect(avatarInitial({ name: "mira okafor" })).toBe("M");
  });

  it("skips the @ of a handle", () => {
    expect(avatarInitial({ name: "@bea" })).toBe("B");
  });

  it("falls back to no initial when there is no name", () => {
    expect(avatarInitial({ name: null })).toBe("");
  });
});
