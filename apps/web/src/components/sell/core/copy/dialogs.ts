import { required } from "@/lib/copy";

export const feeLine = {
  live: "A small MON network fee applies. You see the exact fee before you confirm.",
  demo: "Network fee: simulated, nothing charged",
} as const;

export const addBudgetCopy = {
  title: "Add to reward budget",
  required: required.depositFirst,
  current: "Current budget",
  amount: "Amount",
  max: "Max",
  preview:
    "After this deposit: {newAvailable} available. That covers {sales} more full rewards of {reward}.",
  previewNoReward: "After this deposit: {newAvailable} available.",
  balance: "Your SDUSD: {balance}",
  getFunds: "Get test SDUSD",
  stepsTwo: "Two steps: allow the SDUSD, then deposit it.",
  stepsOne: "One step: deposit. Your allowance already covers this amount.",
  primary: "Add {amount}",
  primaryIdle: "Add to budget",
  ended: "This campaign has ended. Its budget can’t be topped up.",
  capReached: "This campaign’s reward budget is at its lifetime limit of {cap}.",
  room: "Room under the lifetime limit: {room}",
  discardSubject: "this top-up",
  errors: {
    empty: "Enter an amount.",
    notNumber: "Enter an amount like 250 or 250.50.",
    decimals: "SDUSD has at most 6 decimal places.",
    zero: "Enter more than 0.",
    balance: "You have {balance}. Get test SDUSD or enter less.",
    room: "This campaign’s lifetime limit is {cap}. You can add up to {room}.",
  },
} as const;

export const withdrawCopy = {
  title: "Withdraw unused budget",
  body: "You can take back reward funds that no sale has reserved. Reserved and owed rewards stay in the vault until they settle, are refunded or are claimed.",
  available: "Available to withdraw",
  staying: "Staying in the vault",
  reserved: "Reserved for pending sales",
  owed: "Owed to distributors",
  sentTo: "Sent to",
  thisAccount: "the wallet that runs this campaign",
  paused:
    "This returns all {available}. If you resume, new referred sales are refused until you add budget. Direct sales still go through.",
  later: "Rewards from sales refunded later return here and can be withdrawn then.",
  live: "Pause or end the campaign to withdraw unused rewards. A live campaign keeps its rewards so distributors aren’t surprised mid-sale.",
  nothing:
    "Nothing to withdraw. Everything left is reserved for pending sales or owed to distributors.",
  primary: "Withdraw {amount}",
  pause: "Pause campaign",
  end: "End campaign",
} as const;

export const pauseCopy = {
  pauseTitle: "Pause {campaign}?",
  pauseBody:
    "New orders and new links stop while it’s paused. Pending sales still settle or can be refunded, and everyone can still claim.",
  pauseNotice: "Distributors with links get a notification.",
  pausePrimary: "Pause campaign",
  resumeTitle: "Resume {campaign}?",
  resumeBody: "New orders and links start again under the same commission terms.",
  resumeExhausted:
    "The budget is exhausted, so new referred sales are refused until you add funds. Direct sales still go through.",
  addBudget: "Add to budget",
  resumePrimary: "Resume campaign",
  ended: "This campaign has ended and can’t be resumed.",
  alreadyPaused: "This campaign is already paused.",
  alreadyLive: "This campaign is already live.",
} as const;

export const endCopy = {
  title: "End {campaign}?",
  body: "Ending is permanent. The campaign stops taking orders and new links for good. Pending sales still settle or can be refunded, and everyone can still claim what they earned.",
  withdraw: "After it ends you can withdraw the unused budget of {available}.",
  confirm: "I understand this can’t be undone.",
  confirmError: "Tick the box to confirm.",
  primary: "End campaign",
  keep: "Keep it running",
  already: "This campaign has already ended.",
} as const;

export const refundCopy = {
  title: "Refund sale #{saleId}",
  closes: "Refund window closes {relative}",
  buyer: "Buyer",
  product: "Product",
  paid: "Paid",
  time: "Bought",
  effectsTitle: "What this refund does",
  effectBuyer: "{buyer} gets {price} back from the sale escrow. Your wallet isn’t charged.",
  effectRewards:
    "Reserved rewards of {reward} are cancelled and return to this campaign’s available budget.",
  effectPeople: "{n} distributors will see this sale as refunded.",
  effectPeopleOne: "1 distributor will see this sale as refunded.",
  effectAccess: "The buyer loses access to the product through Spoke. This can’t be undone.",
  reason: "The buyer’s reason",
  reply: "Reply to the buyer",
  replyHelper: "Sent with the refund. Up to 1,000 characters.",
  replyError: "Keep it under 1,000 characters.",
  caution:
    "Refund only under your published refund terms. Refunds are public on the sale’s receipt.",
  tight:
    "The refund window closes in {seconds} s. If your transaction lands after it closes, it fails and nothing changes.",
  confirm: "I’m refunding this sale under my published refund terms.",
  confirmError: "Confirm this refund follows your refund terms.",
  primary: "Refund {price}",
  closed:
    "The settlement hold ended {unlockAt}. This sale can no longer be refunded through Spoke.",
  finalizeInstead: "Finalize sale",
  refunded: "This sale was refunded {time}.",
  finalized: "This sale has settled and can’t be refunded through Spoke.",
  notMerchant: "Only the merchant who runs this campaign can refund this sale.",
  discardSubject: "your reply",
  replyFailed: "The refund went through, but your reply wasn’t sent.",
  sendAgain: "Send reply again",
} as const;
