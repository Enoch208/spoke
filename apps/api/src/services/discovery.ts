import { distributorCard } from "@spoke/protocol";
import type { ReputationFacts } from "./reputation.js";

export const discoveryScore = (
  settled: number,
  merchants: number,
  refunded: number,
  days: number,
) => {
  const recency = days <= 30 ? 1 : days >= 180 ? 0.2 : 1 - ((days - 30) * 0.8) / 150;
  const refundedShare = settled + refunded === 0 ? 0 : refunded / (settled + refunded);
  return {
    score: (Math.min(settled, 20) + 4 * Math.min(merchants, 5)) * (1 - refundedShare) * recency,
    recency,
    refundedShare,
  };
};
export const discoveryView = (
  facts: ReputationFacts,
  categories: string[] = [],
  slot: "ranked" | "new" = "ranked",
  reveal = false,
) => {
  const age = facts.lastSettledAt
    ? Math.max(0, (Date.now() - Date.parse(facts.lastSettledAt)) / 86400000)
    : 180;
  const ranking = discoveryScore(
    facts.settled.length,
    facts.merchantCount,
    facts.refunded.length,
    age,
  );
  const matching = facts.categorySales.filter((category) => categories.includes(category)).length;
  const band =
    categories.length === 0 ? 0 : matching * 2 >= facts.settled.length ? 2 : matching > 0 ? 1 : 0;
  const fields = new Set(facts.visibility.fields);
  const conversions = reveal || fields.has("settledConversions");
  const diversity = reveal || fields.has("merchantCount");
  const signals = [
    ...(conversions
      ? [
          { name: "settledSales", value: facts.settled.length },
          { name: "directSales", value: facts.direct },
          { name: "networkSales", value: facts.network },
          { name: "categoryMatchBand", value: band },
          {
            name: "categoryShare",
            value: facts.settled.length ? matching / facts.settled.length : 0,
          },
          { name: "recency", value: ranking.recency },
        ]
      : []),
    ...(diversity ? [{ name: "distinctMerchants", value: facts.merchantCount }] : []),
    ...(reveal || fields.has("refundAdjustment")
      ? [{ name: "refundedShare", value: ranking.refundedShare }]
      : []),
  ];
  return {
    card: distributorCard.parse({
      address: reveal || facts.visibility.level === "public" ? facts.address : null,
      handle: facts.account?.payload.handle ?? null,
      displayName:
        facts.visibility.level === "public" ? (facts.account?.payload.displayName ?? null) : null,
      visibility: facts.visibility.level === "private" ? "pseudonymous" : facts.visibility.level,
      settledConversions: conversions ? facts.settled.length : null,
      merchantCount: diversity ? facts.merchantCount : null,
      categories: conversions ? facts.categories : [],
      lastSettledAt: conversions ? facts.lastSettledAt : null,
      rankSignals: signals,
      slot,
      rankingVersion: "discovery-v1",
      methodologyVersion: "settled-path-v1",
      isPartner: reveal,
    }),
    score: ranking.score,
    band,
  };
};
