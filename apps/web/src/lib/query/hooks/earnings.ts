import { queryHook } from "../use-client";

export const useEarningsSummary = queryHook("earnings.summary");
export const useEarningsByCampaign = queryHook("earnings.byCampaign");
export const useEarningsByConversion = queryHook("earnings.byConversion");
export const useEarningsMissed = queryHook("earnings.missed");
export const useEarningsClaimable = queryHook("earnings.claimable");
export const useEarningsClaims = queryHook("earnings.claims");
