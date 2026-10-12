import type { MessageWithActions } from "./types";

export const unauthorisedCopy = {
  otherMerchant: {
    title: "Only this campaign’s merchant can manage it",
    body: "You’re signed in as {account}. Switch to the account that created the campaign.",
    actions: ["Switch account", "View public page"],
  },
  otherBuyer: {
    title: "This purchase belongs to another account",
    body: "Its public receipt shows the onchain proof without personal details.",
    actions: ["View public receipt"],
  },
  ops: {
    title: "This area is for Spoke operators",
    body: "Your account doesn’t have operator access.",
    actions: ["Go home"],
  },
  teamRole: {
    title: "Your role can’t do this",
    body: "Ask an owner of {merchantName} to change your role.",
    actions: ["Back"],
  },
  invitationOnly: {
    title: "This campaign is invitation only",
    body: "Only invited distributors can create links. Anyone can still view it.",
    actions: ["View campaign", "Find other campaigns"],
  },
} as const satisfies Record<string, MessageWithActions>;
