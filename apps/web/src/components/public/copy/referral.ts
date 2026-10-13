export const referralCopy = {
  strip: "Shared with you by {sharer}",
  stripEarn: "{sharer} may earn a commission if you buy.",
  change: "Change",
  removeConfirm: "Buy without {sharer}’s referral? They won’t be credited.",
  remove: "Remove referral",
  keep: "Keep it",
  invalid: "This referral link isn’t valid. You can still buy or share without it.",
  otherCampaign: "This referral link is for a different campaign: {product}.",
  openOther: "Open {product}",
  stayHere: "Stay here without it",
  expired:
    "This referral link was made on an earlier test deployment of Spoke and no longer works.",
  dismiss: "Dismiss",
  fallbackSharer: "A Spoke distributor",
  sharedSuffix: "shared this with you",
  sameprice: "{sharer} may earn a commission if you buy. Your price is the same either way.",
  createHelper: "Pass it on under {sharer}. You earn only when a sale through your link settles.",
  rewardGoes: "Where the reward goes",
  rewardIntro:
    "If you buy, {reward} ({rate}) comes from {merchant}’s funded budget, not your price, and is split nearest first:",
  sharedIt: "shared it with you",
  passedOn: "passed it on",
  outsideWindow:
    "{count} further up this branch. This campaign pays the nearest {paid}, so they aren’t paid for sales through this link.",
  repeated: "{person} appears more than once in this path. Only their nearest position is paid.",
  shortRenormalize:
    "Only {count} eligible people are in this path. The campaign’s short-path rule changes the split to {split}.",
  shortReturn:
    "Only {count} eligible people are in this path. The campaign’s short-path rule pays {split} and returns {returned} to the merchant’s reward budget.",
  oneRenormalize: "Only one eligible person is in this path, so they receive the whole reward.",
  oneReturn:
    "Only one eligible person is in this path. The campaign’s short-path rule pays them {share} and returns {returned} to the merchant’s reward budget.",
  returnedRow: "Returned to the merchant’s budget",
  settlesFooter: "Settles {hold} after purchase. A refund before then cancels these rewards.",
  passItOn: "If you pass it on",
  projection: "When someone buys through your link:",
  droppedOut: "{person} is then outside the paid window for sales through your link.",
  freeToCreate:
    "Creating a link is free and earns nothing by itself. You earn only when a sale through your link settles.",
  outsideViewer:
    "You’re further up this branch, outside the paid window, so buying through this link is allowed.",
  seeDetails: "See full campaign details",
  total: "Total",
  you: "You",
  level: "Level {level}",
  unknownTitle: "This link doesn’t work",
  unknownBody:
    "We couldn’t find a Spoke link with this code. Check that you copied all of it, or ask the person who sent it for a new one.",
  whatIsSpoke: "What is Spoke?",
  expiredTitle: "This link has expired",
  expiredBody:
    "It was made on an earlier test deployment of Spoke, which has since been reset. The campaign it pointed to no longer exists here.",
  hiddenTitle: "This link was retired",
  hiddenBody:
    "Spoke no longer accepts purchases or links through it. Sales already made through it still settle and pay out onchain.",
  exploreCampaigns: "Explore campaigns",
  pausedState:
    "{sharer}’s link is fine, but {merchant} has paused this campaign. Purchases and new links are on hold.",
  endedState: "This campaign has ended, so this link no longer works for new purchases.",
} as const;
