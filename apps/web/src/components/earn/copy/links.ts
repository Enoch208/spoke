export const policyCopy = {
  rate: "{pct} · up to {cap} per sale",
  levels: "{n} levels · {split}",
  oneLevel: "1 level · 100",
  hold: "{hold} hold",
  shortRenormalize: "Short paths share the whole reward",
  shortReturn: "Short paths return the unused share to the merchant",
  version: "Policy v{version}",
  weightsLabel: "Reward split by level, nearest first",
  levelShort: "L{n}",
  labels: { rate: "Commission", levels: "Levels", hold: "Hold", short: "Short paths" },
} as const;

export const createLinkCopy = {
  title: "Create your link",
  bodyRoot:
    "You’ll get your own link to {product}. When someone buys through it, or through a link made from yours, you can earn from {merchant}’s reward budget.",
  bodyParent:
    "You’re joining from {parentHandle}’s link. Your link sits under theirs, so a sale through your link also rewards up to {above} people above you.",
  splitTitle: "How rewards split",
  rewardLine:
    "Reward: {pct} of each sale, up to {cap} per sale, paid from {merchant}’s funded budget.",
  you: "You, if you made the sale",
  above: "{n} level above",
  abovePlural: "{n} levels above",
  example: "On a {price} sale the reward is {reward}.",
  shortReturned:
    "Only {k} eligible people are in this path. The unused share stays in {merchant}’s budget.",
  levelsTable: "Level, share, amount",
  settlement:
    "Settlement: rewards are held for {hold} after each sale, and the merchant can refund during that time. After that you can claim.",
  rules:
    "You earn only from real sales that aren’t refunded. Joining is free. There is no fee to join and no reward for signing people up.",
  consent: "I’ll tell people I may earn from purchases through my link.",
  consentError: "Tick this to continue. Recommendations on Spoke must say you may earn.",
  primary: "Create my link",
  creating: "Creating your link…",
  signIn: "Sign in to create your link",
  alreadyJoined: "You already have a link for this campaign.",
  cantMove: "Links can’t be moved once created, so your existing link stays where it is.",
  openShareKit: "Open my share kit",
  merchant: "You run this campaign, so you can’t earn from it. Share the campaign page instead.",
  copyCampaign: "Copy campaign link",
  inviteOnly: "This campaign is invitation-only. Ask {merchant} for an invitation.",
  seeInvitation: "See your invitation",
  pausedExtra: "New links are paused too.",
  ended: "This campaign has ended. It no longer accepts new links or sales.",
  exhausted: "The campaign’s commission budget is exhausted. Rewarded checkout is unavailable.",
  wontEarn:
    "You can still create a link, but sales won’t earn rewards until {merchant} adds budget.",
  invalidParent: "This link isn’t valid anymore. You can create a link straight from the campaign.",
  fromCampaign: "Create a link from the campaign",
  capacity: "This campaign has reached its limit of links.",
  notDeployed: "Spoke’s contracts aren’t deployed on this network yet.",
} as const;

export const shareKitCopy = {
  title: "Share your link",
  copyLink: "Copy link",
  share: "Share…",
  qr: "QR code",
  shareTo: "Share to",
  email: "Email",
  shareOn: "Share on {app}",
  copyFor: "Copy caption for {app}",
  demoOff: "Sharing is off in the demo, so no sample link leaves this browser.",
  caption:
    "I’ve been using {product} from {merchant}. If you buy through my link I may earn a commission. {url}",
  captionLabel: "Caption",
  captionHelp: "Keep the part about earning a commission. It’s required, and people trust it.",
  captionWarning: "Your caption doesn’t say you may earn. Add it back before sharing.",
  copyCaption: "Copy caption",
  embedTitle: "Embed card",
  embedBody: "A small card for your site that links to this campaign through your link.",
  embedAction: "Copy the embed snippet",
  snippetCopied: "Snippet copied",
  stats:
    "Opens {opens} (offchain estimate) · Sales {settled} settled, {pending} pending · Earned {earned} settled",
  statsHelp: "Only finalized and non-refunded sales count toward public performance.",
  statsUnavailable: "Stats aren’t available right now.",
  openLinkPage: "Open link page",
  ended: "This campaign has ended. People who open your link will see that it ended.",
  demoTag: "Demo",
} as const;

export const qrCopy = {
  title: "QR code",
  png: "Download PNG",
  svg: "Download SVG",
  copy: "Copy link",
  failed: "Couldn’t make a QR code. Copy the link instead.",
  sample: "Sample link · works only in demo mode in this browser",
} as const;
