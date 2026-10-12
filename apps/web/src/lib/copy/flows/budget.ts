import { required } from "../required";

export const budgetFlow = {
  tooLow: "Deposit at least {amount} so one referred sale can be rewarded.",
  topUpNote: required.depositFirst,
  exhausted: "New referred sales are refused until you add budget. Direct sales still go through.",
  pauseToWithdraw:
    "Unused budget can be withdrawn only while the campaign is paused, ended or expired. Pausing stops new sales; refunds, finalizing and claims keep working.",
  nothingToWithdraw:
    "Nothing to withdraw. Remaining rewards are reserved for pending sales or waiting to be claimed.",
  endedNoTopUp: "This campaign has ended. Launch a new one to offer rewards again.",
  capReached:
    "This campaign reached its lifetime reward cap, so more rewards can’t be used. Launch a new campaign instead.",
} as const satisfies Record<string, string>;
