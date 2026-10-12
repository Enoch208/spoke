import type { ReplacementReason } from "viem";
import { common } from "../common";
import type { MessageWithActions } from "../types";
import type { TxCopySource } from "./actions-shape";

type RepricedCopy = { readonly stepLine: string };

type TxReplacementCopy = Record<Exclude<ReplacementReason, "repriced">, MessageWithActions> & {
  readonly repriced: RepricedCopy;
};

export const txReplacementOutcomes = {
  repriced: {
    stepLine: "Sped up in your wallet. Tracking the new transaction.",
  },
  replaced: {
    title: "Replaced in your wallet",
    body: "Another transaction from your wallet took this one’s place. We’re checking whether {actionName} still happened.",
    actions: ["Check again"],
  },
  cancelled: {
    title: "Cancelled in your wallet",
    body: "Your wallet cancelled this transaction. Nothing changed.",
    actions: [common.tryAgain],
  },
} as const satisfies TxReplacementCopy;

export const txUnknownOutcomes = {
  resolvedSuccess: { from: "action.success" },
  neverMined: {
    title: "It didn’t go through",
    body: "The network never included this transaction. Nothing changed. You can try again.",
    actions: [common.tryAgain],
  },
} as const satisfies {
  readonly resolvedSuccess: TxCopySource;
  readonly neverMined: MessageWithActions;
};
