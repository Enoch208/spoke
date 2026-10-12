import { required } from "../required";

export const settleFlow = {
  claimed: "Claimed {amount}",
  alreadyFinal: "Someone already finalized this sale. Its commission is claimable.",
  claimConfirmedSyncing: "Claim confirmed onchain. Updating your balance…",
  final: "This purchase is final. Contact the merchant at {supportContact}.",
  refunded: `${required.refunded} {commission} is back in the available reward budget.`,
  refundTight: "Less than a minute left. The refund may not land in time.",
} as const satisfies Record<string, string>;
