import type { ErrorMessage } from "../types";
import { campaignContractErrors } from "./contract-campaign";
import { saleContractErrors } from "./contract-sale";
import type { ContractErrorCopy } from "./contract-shape";

export type { ContractContext, ContractErrorCopy } from "./contract-shape";

export const contractErrors = {
  ...campaignContractErrors,
  ...saleContractErrors,
} as const satisfies Record<string, ContractErrorCopy>;

export type ContractErrorKey = keyof typeof contractErrors;

export const outOfGas = {
  body: "The transaction ran out of gas. Try again and Spoke will set a higher limit.",
  recovery: ["Try again"],
  retryable: "yes",
} as const satisfies Omit<ErrorMessage, "title">;

export const revertSuffixes = {
  preflight: "Nothing was sent.",
  mined: "The network fee was used; nothing else changed.",
} as const;
