export const availabilityCopy = {
  hidden: {
    heading: "This campaign was removed from Spoke",
    body: "Spoke no longer lists this campaign or accepts purchases or links for it on this site. Sales already made are unaffected: they settle, refund and pay out onchain under their original terms.",
  },
  draft: {
    heading: "Preview: only you can see this",
    body: "This campaign isn’t public yet. Finish it in the campaign builder to fund and launch it.",
  },
  notOpenYet: {
    heading: "Not open yet",
    body: "{merchant} created this campaign onchain but hasn’t funded and opened it. Purchases and links open when it does.",
  },
  paused: {
    heading: "Paused by the merchant",
    body: "New purchases and new links are on hold. Sales already made still settle, refund and pay out as promised.",
  },
  ended: {
    heading: "This campaign has ended",
    body: "{merchant} ended it. No new purchases or links. Every sale already made still settles and pays out under its original terms.",
  },
  expired: {
    heading: "This campaign has expired",
    body: "Its end date passed on {date}. No new purchases or links. Every sale already made still settles and pays out under its original terms.",
  },
  exhausted: {
    heading: "Rewards used up",
    body: "The campaign’s funded rewards are exhausted; this order is not eligible for advertised rewards. Purchases through a link can’t go through until {merchant} adds budget.",
  },
  salesLimit: {
    heading: "Sales limit reached",
    body: "This campaign accepted its maximum of {count} sales. Every sale already made still settles and pays out.",
  },
  live: { heading: null, body: null },
} as const;

export const actionCopy = {
  buy: "Buy for {price}",
  buyWithoutRewards: "Buy without rewards",
  buyDirectly: "Buy directly",
  noCommission: "Nobody earns a commission on this purchase.",
  createLink: "Create my link",
  notOpenYet: "Not open yet",
  purchasesPaused: "Purchases paused",
  linksPaused: "Links paused",
  rewardsUsedUp: "Rewards used up",
  exhaustedCreateNote:
    "You can create your link now. Purchases through it can’t go through until the merchant adds budget.",
  shareLink: "Share my link",
  viewLink: "View my link",
  viewLinkStats: "View link stats",
  creatingLink: "Creating your link…",
  continuePurchase: "Continue your purchase",
  viewPurchase: "View your purchase",
  boughtAgo: "You bought this {relative}.",
  acceptInvitation: "Accept invitation",
  invitationOnly: "Invitation only",
  notInvitedHelper: "Ask {merchant} for an invitation, or build a record on open campaigns first.",
  invitationLine: "Only invited distributors can create links. Anyone can buy.",
  merchantCallout: "You run this campaign. This is what everyone else sees.",
  manageCampaign: "Manage campaign",
  ownLinkStrip: "This is your link. Here’s what people see when you share it.",
  ownLinkSecond:
    "You already have a link for this campaign. You can’t create a second one; share yours instead.",
  selfReferralHeading: "You can’t buy through this link",
  selfReferralBody: "You’re on its referral path, and this campaign does not allow self-referral.",
  lowFunds: "You have {balance}. You need {price} and a little MON for the network fee.",
  getTestFunds: "Get test funds",
  termsUnavailable:
    "We couldn’t load this campaign’s terms, so you can’t buy or create a link until they load.",
  endsIn: "Ends {relative}",
  budgetLow: "Budget left for about {sales}",
  newTerms: "New terms from {date}",
  newTermsLine: "Sales before then keep today’s terms.",
  seeChanges: "See what changes",
  rewardLine:
    "Share it: {rate} of each sale, split across up to {people}. As the nearest sharer you’d earn {amount} per sale.",
  settles: "Settles {hold} after purchase",
} as const;
