export const previewCopy = {
  title: "Preview a {price} sale",
  samplePrice: "Sample price",
  samplePriceHelper: "Only for this preview. It doesn’t change the product.",
  cardOne: "1 person on the path",
  cardMany: "{count} people on the path",
  reward: "Reward on this sale",
  returned: "Returned to your budget: {amount}",
  remainder: "Rounding remainder to Level 1: {amount}",
  outside:
    "Levels {from}–{to} are in the path but outside the paid window. They earn nothing from this sale.",
  outsideOne:
    "Level {from} is in the path but outside the paid window. It earns nothing from this sale.",
  returnShort:
    "Only {countWord} eligible people are in this path. The campaign’s short-path rule pays {count} levels and returns {amount} to your budget.",
  returnShortOne:
    "Only one eligible person is in this path. The campaign’s short-path rule pays 1 level and returns {amount} to your budget.",
  dimmed: "Fix the highlighted fields to see the split.",
  noPrice: "Enter a sample price to see the split.",
  openSimulator: "Open simulator",
  how: {
    title: "How we calculate",
    body: "Each sale’s reward is the price times the rate, never more than the cap. People on the path are paid nearest first by weight; every level above Level 1 is rounded down and Level 1 takes the rest, so the amounts always add up to the reward exactly. On short paths the reward is either shared among the people present in the same proportions or their levels are paid and the rest returns to your budget.",
    checks: "Reference checks",
    checksHelper: "Computed live with the same protocol functions that price every sale.",
    matches: "Matches",
    failed: "Failed",
    vectorReward: "{reward} base units split 50/25/15/10",
    vectorTwo: "Two people renormalized from 50:25",
    expected: "Expected {expected}",
  },
} as const;
