export const rewardErrors = {
  rateEmpty: "Enter a commission rate.",
  rateRange: "Use a rate between 0.01% and 100%.",
  decimals: "Use at most two decimal places.",
  capEmpty: "Enter the most one sale can pay in rewards.",
  capZero: "The per-sale cap must be more than 0.",
  capInvalid: "Enter an amount like 5 or 5.25.",
  tokenDecimals: "{symbol} allows at most {decimals} decimal places.",
  rewardZero: "This price and rate give a reward of 0. Raise the rate or the cap.",
  weightEmpty: "Enter a weight for Level {level}.",
  weightZero:
    "Every paid level needs at least 0.01%. To pay fewer levels, lower the number of people paid.",
  weightInvalid: "Enter a percentage like 25 or 12.5.",
  totalUnder: "Weights must total exactly 100.00%. Now {total}% ({left}% left to assign).",
  totalOver: "Weights must total exactly 100.00%. Now {total}% ({over}% over).",
  levelOneFloor: "Level 1 needs at least 0.01%. Lower another level first.",
  holdMin: "The hold must be at least 1 minute.",
  holdMax: "The hold can be at most 90 days.",
  holdInvalid: "Enter the hold as a whole number.",
  noPrice: "Choose a product first so the reward can be worked out from its price.",
} as const;

export const crossCheckCopy = {
  mismatch:
    "Spoke’s server calculated a different split for this policy. Don’t launch it; we’ve logged the details.",
  report: "Report a problem",
  unavailable:
    "We couldn’t double-check with the server. Your preview uses the protocol’s tested math.",
  checking: "Checking the split with Spoke’s server…",
} as const;
