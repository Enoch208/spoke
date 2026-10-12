export const moneyQualifiers = {
  atRisk: "until {time}",
  readyToFinalize: "hold ended {time}",
  claimable: "finalized {time}",
  claimed: "in {hash}",
} as const;

export const earnFootnotes = {
  amounts:
    "Amounts are your share of merchant-funded rewards. Exact base units are in each sale’s proof.",
} as const;

export const proofLabels = {
  title: "Proof",
  protocol: "Spoke contract",
  token: "SDUSD token",
  method: "Method",
  indexed: "Indexed to block",
  notIndexed: "Not indexed yet",
} as const;
