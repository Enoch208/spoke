import { required } from "../required";

export const campaignFlow = {
  launched: "Campaign is live",
  finishLaunch: "Created onchain. Add a reward budget to open it for sales.",
  notOpen: "This campaign isn’t open yet.",
  liveSyncing: "Live onchain. Appearing in Explore shortly.",
  pausedNotice: required.paused,
  endedNotice: "This campaign has ended. Links and earnings from it stay in your history.",
  exhaustedJoin:
    "Rewards are used up right now. Sales through your link won’t earn until the merchant adds more.",
} as const satisfies Record<string, string>;
