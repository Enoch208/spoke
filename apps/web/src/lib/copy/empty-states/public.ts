import { required } from "../required";
import type { EmptyStateCopy } from "./shape";

export const publicEmptyStates = {
  "ES-01": {
    list: "Explore campaigns (PUB-02)",
    title: "No campaigns are live yet",
    body: "When merchants fund campaigns on Monad Testnet, they appear here with their terms and reward budget.",
    actions: ["Launch a campaign", "Explore the demo"],
    illustration: "IMG-EXPLORE-EMPTY",
  },
  "ES-02": {
    list: "Campaign activity (PUB-03)",
    title: "No sales yet",
    body: "Sales through this campaign’s links appear here once they’re onchain.",
    actions: ["Create my link"],
  },
  "ES-03": {
    list: "Campaign network (PUB-04, SELL-07 network tab)",
    title: "No links yet",
    body: "The graph grows when people create links for this campaign. The first link starts a branch.",
    actions: ["Create the first link"],
    merchantActions: ["Invite a distributor"],
    illustration: "IMG-EMPTY-NETWORK",
  },
  "ES-04": {
    list: "Distributor directory (PUB-08)",
    title: "No public profiles yet",
    body: "Distributors appear here after a settled sale, if they choose a public profile.",
    actions: ["Explore campaigns"],
    illustration: "code:piece-trio",
  },
  "ES-05": {
    list: "Distributor profile record (PUB-07)",
    title: "No settled sales yet",
    body: required.reputation,
  },
  "ES-06": {
    list: "Merchant offers (PUB-09)",
    title: "{merchantName} has no live campaigns",
    body: "Past campaigns and their settled sales stay on this page.",
    actions: ["Explore campaigns"],
  },
} as const satisfies Record<string, EmptyStateCopy>;
