import { describe, expect, it } from "vitest";
import { clientMethodSchemas } from "@spoke/protocol";
import {
  comparisonIds,
  comparisonIdentity,
  comparisonToken,
  distributorIdentity,
  toggleComparison,
  uniqueDistributors,
} from "../../src/components/public/directory/comparison-model";
import { matchesQuery } from "../../src/components/public/directory/filters";

const address = "0x0000000000000000000000000000000000000001";
const card = clientMethodSchemas["distributors.get"].output.parse({
  address,
  handle: "alice",
  displayName: "Alice Research",
  visibility: "public",
  settledConversions: 1,
  merchantCount: 1,
  categories: [],
  lastSettledAt: null,
  rankSignals: [],
  slot: "ranked",
  rankingVersion: "discovery-v1",
  methodologyVersion: "settled-path-v1",
  isPartner: false,
});

describe("merchant comparison selection", () => {
  it("accepts only public profile identifiers and limits requests from the URL", () => {
    expect(comparisonIdentity(" @ALICE ")).toBe("alice");
    expect(comparisonIdentity(address)).toBe(address);
    expect(comparisonIds("alice,ALICE,bob,charlie,dave,https://example.com")).toEqual([
      "alice",
      "bob",
      "charlie",
    ]);
    expect(comparisonIds("../../settings,<script>,%2Fme,,")).toEqual([]);
  });
  it("keeps existing candidates when full, and allows replacing a removed candidate", () => {
    const selected = ["alice", "bob", "charlie"];
    expect(toggleComparison(selected, "dave")).toEqual(selected);
    expect(toggleComparison(toggleComparison(selected, "BOB"), "dave")).toEqual([
      "alice",
      "charlie",
      "dave",
    ]);
    expect(toggleComparison(selected, "../../me")).toEqual(selected);
  });
  it("deduplicates ranked and newcomer slots without revealing a pseudonymous wallet", () => {
    const pseudonymous = {
      ...card,
      handle: "bob",
      address: null,
      displayName: null,
      visibility: "pseudonymous" as const,
    };
    expect(uniqueDistributors([card, { ...card, slot: "new" }, pseudonymous])).toEqual([
      card,
      pseudonymous,
    ]);
    expect(distributorIdentity(pseudonymous)).toBe("bob");
    expect(matchesQuery(pseudonymous, address)).toBe(false);
    expect(matchesQuery(card, "research")).toBe(true);
    expect(matchesQuery(card, address)).toBe(true);
    expect(matchesQuery(card, "@ALICE")).toBe(true);
  });
  it("does not guess a token denomination when receipt evidence is withheld", () => {
    expect(
      comparisonToken({ settledConversions: null, evidence: { items: [], nextCursor: null } }),
    ).toBeNull();
    const first = { chainId: 10143, token: { address, decimals: 6, symbol: "SDUSD" } };
    expect(
      comparisonToken({ settledConversions: 2, evidence: { items: [first], nextCursor: "next" } }),
    ).toBeNull();
    expect(
      comparisonToken({ settledConversions: 2, evidence: { items: [first], nextCursor: null } }),
    ).toBeNull();
    expect(
      comparisonToken({
        settledConversions: 2,
        evidence: { items: [first, first], nextCursor: null },
      }),
    ).toEqual(first.token);
    expect(
      comparisonToken({
        settledConversions: 2,
        evidence: { items: [first, { ...first, chainId: 143 }], nextCursor: null },
      }),
    ).toBeNull();
    expect(
      comparisonToken({
        settledConversions: 2,
        evidence: {
          items: [first, { ...first, token: { ...first.token, decimals: 18 } }],
          nextCursor: null,
        },
      }),
    ).toBeNull();
  });
});
