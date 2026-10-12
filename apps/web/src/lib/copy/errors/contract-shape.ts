import type { ApiErrorKey, ErrorCopy } from "./api";
import type { ClientErrorCode } from "./client";

export type ContractContext =
  | "any"
  | "merchantActions"
  | "createCampaign"
  | "fundCampaign"
  | "createNode"
  | "purchase"
  | "refund"
  | "finalize"
  | "claimRewards"
  | "claimProceeds"
  | "withdrawUnused"
  | "withdrawAvailableReward"
  | "resume"
  | "mintDemoTokens";

export type ContractErrorCopy = ErrorCopy & {
  readonly code: ApiErrorKey;
  readonly contexts: readonly ContractContext[];
  readonly shownAs?: ClientErrorCode;
};
