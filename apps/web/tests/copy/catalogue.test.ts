import { describe, expect, it } from "vitest";
import * as copy from "../../src/lib/copy";
import { fill } from "../../src/lib/copy/fill";

const bannedPhrases = [
  "unleash",
  "supercharge",
  "seamless",
  "empower",
  "the future of",
  "revolutionary",
  "game-changing",
  "effortless",
  "frictionless",
  "magic",
  "ai-powered",
  "fraud-proof",
  "guaranteed earnings",
  "passive income",
  "get rich",
  "earn while you sleep",
  "join my team",
  "downline",
  "upline",
  "trusted by",
  "paid out",
  "vested",
  "pending settlement",
  "oops",
  "whoops",
  "uh-oh",
];

const collectStrings = (value: unknown, path: string, out: { path: string; text: string }[]) => {
  if (typeof value === "string") {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectStrings(item, `${path}[${String(index)}]`, out);
    });
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key !== "icon") collectStrings(item, `${path}.${key}`, out);
    }
  }
};

const strings = (() => {
  const out: { path: string; text: string }[] = [];
  for (const [name, value] of Object.entries(copy)) {
    if (typeof value !== "function") collectStrings(value, name, out);
  }
  return out;
})();

describe("copy catalogue", () => {
  it("has strings to check", () => {
    expect(strings.length).toBeGreaterThan(20);
  });

  it("uses typographic apostrophes and quotes", () => {
    const straight = strings.filter(({ text }) => /['"]/.test(text));
    expect(straight).toEqual([]);
  });

  it("never uses banned words or claims", () => {
    const offenders = strings.filter(({ text }) =>
      bannedPhrases.some((phrase) => text.toLowerCase().includes(phrase)),
    );
    expect(offenders).toEqual([]);
  });

  it("never uses exclamation marks", () => {
    expect(strings.filter(({ text }) => text.includes("!"))).toEqual([]);
  });

  it("keeps every string trimmed, non-empty and single-spaced", () => {
    const untidy = strings.filter(
      ({ text }) => text.trim() !== text || text.length === 0 || text.includes("  "),
    );
    expect(untidy).toEqual([]);
  });
});

describe("required messages", () => {
  it("renders the demo split preview verbatim", () => {
    expect(fill(copy.required.splitPreview, { split: "50/25/15/10", levelsWord: "four" })).toBe(
      "This sale would allocate 50/25/15/10 across the four eligible contributors.",
    );
  });

  it("renders the two-person short path verbatim", () => {
    expect(fill(copy.required.shortPath, { countWord: "two", split: "66.67/33.33" })).toBe(
      "Only two eligible people are in this path. The campaign’s short-path rule changes the split to 66.67/33.33.",
    );
  });

  it("maps every used RM id to a message", () => {
    for (const key of Object.values(copy.requiredIds)) {
      expect(copy.required[key].length).toBeGreaterThan(0);
    }
    expect(Object.keys(copy.requiredIds)).not.toContain("RM-16");
    expect(Object.keys(copy.requiredIds)).not.toContain("RM-19");
    expect(Object.keys(copy.requiredIds)).not.toContain("RM-20");
  });
});
