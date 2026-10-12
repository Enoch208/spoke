import type { TxActionName, TxCopySource } from "./actions-shape";

type ApproveCopy = {
  readonly usedBy: readonly TxActionName[];
  readonly step: string;
  readonly beforeConfirm: Readonly<Record<"purchase" | "deposit", string>>;
  readonly progress: string;
  readonly done: string;
  readonly skipped: string;
  readonly rejected: string;
  readonly failed: TxCopySource;
};

export const txApprove = {
  usedBy: ["createCampaign", "fundCampaign", "purchase"],
  step: "Allow {amount}",
  beforeConfirm: {
    purchase:
      "Lets the Spoke contract use exactly {amount} for this purchase. Nothing is spent until the next step.",
    deposit:
      "Lets the Spoke contract use exactly {amount} for this deposit. Nothing is spent until the next step.",
  },
  progress: "Allowing…",
  done: "Allowed",
  skipped: "Already allowed. Skipping this step.",
  rejected: "Cancelled in your wallet. Nothing was allowed or spent.",
  failed: { from: "errorMapping" },
} as const satisfies ApproveCopy;
