import { required } from "../required";
import type { EmptyStateCopy } from "./shape";

export const earnEmptyStates = {
  "ES-10": {
    list: "Earn home (EARN-01)",
    title: "Start with a campaign",
    body: "Pick something you’d recommend anyway, create your link and share it. You earn only when a purchase through it settles.",
    actions: ["Find a campaign"],
    illustration: "IMG-EMPTY-EARN",
  },
  "ES-11": {
    list: "Opportunities (EARN-02)",
    title: "No open campaigns right now",
    body: "New campaigns appear here as merchants fund them.",
    actions: ["Explore the demo"],
    illustration: "code:piece-lime",
  },
  "ES-12": {
    list: "My links (EARN-03)",
    title: "You haven’t created a link yet",
    body: "Join a campaign to get a link you can share anywhere. A link costs only a small network fee.",
    actions: ["Find a campaign"],
    illustration: "IMG-EMPTY-LINKS",
  },
  "ES-13": {
    list: "Link purchases (EARN-04)",
    title: "No purchases through this link yet",
    body: "Share it where people already ask you for recommendations.",
    actions: ["Share link"],
  },
  "ES-14": {
    list: "Link branches (EARN-04)",
    title: "No one has shared from your link yet",
    body: "When someone creates their own link from yours, it appears here as a branch.",
    actions: ["Share link"],
  },
  "ES-15": {
    list: "Network explorer (EARN-05)",
    title: "Your network starts with your first link",
    body: "Create a link and share it. Branches appear as people share from it.",
    actions: ["Find a campaign"],
    illustration: "IMG-EMPTY-NETWORK",
  },
  "ES-16": {
    list: "Earnings (EARN-06)",
    title: "No earnings yet",
    body: "When someone buys through your link, or a link shared from it, your share appears here as pending, then claimable after the hold.",
    actions: ["Share a link"],
    illustration: "IMG-EMPTY-EARNINGS",
  },
  "ES-17": {
    list: "Earnings, Pending tab",
    title: "No pending earnings",
    body: "New sales through your links show here during their hold.",
  },
  "ES-18": {
    list: "Earnings, Claimable tab",
    title: "Nothing to claim yet",
    body: "Earnings become claimable once their sale’s hold ends and it’s finalized.",
  },
  "ES-19": {
    list: "Earnings, Claimed tab",
    title: "No claims yet",
    body: "Claimed earnings and their transactions appear here.",
  },
  "ES-20": {
    list: "Earnings, Reversed tab",
    title: "Nothing reversed",
  },
  "ES-21": {
    list: "Payouts (EARN-07)",
    title: "No claims yet",
    body: "When you claim settled earnings, each transfer appears here with its transaction.",
    actions: ["View earnings"],
    illustration: "IMG-EMPTY-EARNINGS",
  },
  "ES-22": {
    list: "Reputation (EARN-08)",
    title: "Your record starts with a settled sale",
    body: required.reputation,
    actions: ["View my links"],
    illustration: "IMG-EMPTY-REPUTATION",
  },
  "ES-23": {
    list: "Invitations (EARN-09)",
    title: "No invitations yet",
    body: "Merchants can invite you after seeing your settled record. A public profile helps them find you.",
    actions: ["Profile visibility"],
  },
  "ES-24": {
    list: "Communities (EARN-10, demo)",
    title: "No communities yet",
    body: "Start a community program to share campaigns with a group and see its settled results.",
    actions: ["Create a community"],
    illustration: "code:piece-trio",
  },
} as const satisfies Record<string, EmptyStateCopy>;
