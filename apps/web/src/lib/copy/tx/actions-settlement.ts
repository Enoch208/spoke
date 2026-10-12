import { required } from "../required";
import type { TxActionCopy } from "./actions-shape";

const finalizeStep = "Finalize sale";
const finalizing = "Finalizing…";
const finalizeFirst = "Finalizes {n} sales whose hold has ended, then claims.";
const viewProof = "View proof";

const finalize = {
  name: "Finalize sale",
  label: "Finalize sale #{saleId}",
  steps: [finalizeStep],
  idle: { one: finalizeStep, many: "Finalize {n} sales" },
  batchLimit: "Finalize up to 10 sales at a time.",
  beforeConfirm: [
    "The hold ended {unlockAt}. Finalizing settles the sale: the merchant’s proceeds and each share on the path become claimable. Anyone can do this.",
  ],
  progress: finalizing,
  success: {
    title: "Sale settled",
    body: required.finalized,
    followUp: "The merchant’s proceeds for this sale are now claimable.",
    actions: { nowClaimable: ["Claim {amount}", viewProof], otherwise: ["Done", viewProof] },
  },
  toast: { text: "Sale #{saleId} settled", action: "Claim" },
  race: {
    title: "Already settled",
    body: "Someone finalized this sale first. Its commission is claimable.",
  },
  failures: ["SALE_NOT_MATURE", "SALE_ALREADY_FINALIZED", "SALE_REFUNDED"],
  infoFailures: ["SALE_ALREADY_FINALIZED"],
  summary: [
    "Rewards becoming claimable {reward} for {n} people",
    "Merchant proceeds becoming claimable {price}",
  ],
} as const satisfies TxActionCopy;

const claimSummary = {
  finalizing: "Finalizing {n} sales first",
  claiming: "Claiming {amount}",
  to: "To {address} (this account)",
} as const;

const settledEarnings =
  "Moves all your settled SDUSD earnings to your account. Earnings still in their hold stay reserved until they settle.";

const claimRewards = {
  name: "Claim earnings",
  label: { claim: "Claim {amount}", withFinalize: "Finalize {n} sales and claim {amount}" },
  steps: ["Claim"],
  finalizeStep,
  idle: { claim: "Claim {amount}", withFinalize: "Finalize {n} sales and claim" },
  beforeConfirm: { claim: [settledEarnings], withFinalize: [finalizeFirst, settledEarnings] },
  progress: { finalize: finalizing, claim: "Claiming…" },
  success: { title: "Claimed {amount}", body: required.claimed, actions: ["Done"] },
  toast: { text: "Claimed {amount}", action: "View transaction" },
  failures: ["NOTHING_TO_CLAIM", "CLAIM_NOT_AVAILABLE", "INSUFFICIENT_MON"],
  summary: claimSummary,
} as const satisfies TxActionCopy;

const settledProceeds =
  "Moves proceeds from settled sales in {campaignName} to your account. Sales still in their hold stay held.";

const claimProceeds = {
  name: "Claim sale proceeds",
  label: { allCampaigns: "Claim proceeds", oneCampaign: "Claim proceeds from {campaign}" },
  steps: ["Claim proceeds"],
  finalizeStep,
  idle: "Claim {amount} in proceeds",
  beforeConfirm: { claim: [settledProceeds], withFinalize: [finalizeFirst, settledProceeds] },
  progress: { finalize: finalizing, claim: "Claiming proceeds…" },
  success: { title: "Proceeds claimed", body: required.claimed, actions: ["Done"] },
  toast: { text: "Claimed {amount} in proceeds", action: "View transaction" },
  failures: ["NOTHING_TO_CLAIM", "NOT_AUTHORIZED"],
  summary: claimSummary,
} as const satisfies TxActionCopy;

export const settlementTxActions = { finalize, claimRewards, claimProceeds } as const;
