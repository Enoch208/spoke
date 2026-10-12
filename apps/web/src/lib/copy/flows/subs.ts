export const subsFlow = {
  rewardsEnded: "Rewards for this subscription have ended ({count} of {total} renewals).",
  campaignEnded: "Renewals after the campaign ended don’t earn rewards.",
} as const satisfies Record<string, string>;
