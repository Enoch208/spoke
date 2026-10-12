import { required } from "@/lib/copy";

export const feeLine = {
  live: "Network fee: a little testnet MON. You see the exact amount before you confirm.",
  demo: "Network fee: simulated, nothing charged",
} as const;

export const fundsNotice = {
  line: "You need a little testnet MON for network fees. It’s free.",
  action: "Get test funds",
} as const;

export const finalizeDialog = {
  title: "Finalize sale #{saleId}",
  batchTitle: "Finalize {n} sales",
  body: "The settlement hold ended {unlockAt}. Finalizing settles the sale: rewards become claimable for {people} and {merchant}’s proceeds become available. Anyone can do this once the hold ends; it doesn’t change who gets paid.",
  batchBody: "This sends {n} transactions, one per sale.",
  batchLimit: "Finalize up to 10 sales at a time.",
  rewards: "Rewards becoming claimable",
  yourShare: "Your share",
  proceeds: "Merchant proceeds",
  noRefunds: "Refunds are no longer possible after this",
  primary: "Finalize sale",
  batchPrimary: "Finalize {n} sales",
  notMature: required.pendingHold,
  countdown: "You can finalize it in {time}.",
  alreadyFinal: "Already finalized {time}. Nothing else to do.",
  refunded: "This sale was refunded. No referral commission was earned.",
  claim: "Claim {amount}",
  holdEnded: "Hold ended {time}",
  progress: "Finalizing {i} of {n}",
  allDone: "All {n} sales are finalized. Their shares are claimable.",
  stopped: "Stopped at sale #{saleId}. The sales after it weren’t sent.",
  resume: "Try again from sale #{saleId}",
  done: "Done",
} as const;

export const claimDialog = {
  rewardTitle: "Claim your earnings",
  proceedsTitle: "Claim sale proceeds",
  sentTo: "Sent to {address} (this account).",
  rewardNote:
    "Only settled rewards can be claimed. {pendingAmount} is still in its hold and unlocks over time.",
  rewardNoteNone: "Only settled rewards can be claimed.",
  proceedsNote: "Only proceeds from settled sales can be claimed.",
  primary: "Claim {amount}",
  primaryWithFinalize: "Finalize {n} sales and claim {amount}",
  proceedsWithFinalize: "Finalize {n} sales and claim proceeds",
  includeReady: "Finalize {n} sales whose hold ended first",
  includeReadyHelp:
    "One transaction per sale, then one claim. Anyone can finalize a sale once its hold ends.",
  finalizesFirst: "Sale #{saleId} · finalizes first",
  claimableNow: "Claimable now",
  readyLine: "Plus proceeds from {n} sales that finalize first",
  nothing: "Nothing to claim yet. Rewards become claimable after their sale settles.",
  nothingProceeds: "No settled proceeds to claim yet.",
  seePending: "See pending",
  changed: "Your claimable amount changed to {amount}.",
  readFromChain: "Read from the contract at block {block}",
  wholeBalance:
    "One claim sends everything claimable in this token in a single transaction. Rewards can’t be redirected to another address.",
  byCampaign: "By campaign",
  checking: "Checking the amount…",
} as const;
