import { queryHook } from "../use-client";

export const useReceiptsGet = queryHook("receipts.get");
export const useReceiptsEvents = queryHook("receipts.events");
export const useReceiptsVerify = queryHook("receipts.verify");
export const useReceiptsRecent = queryHook("receipts.recent");
export const useReceiptsForBuyer = queryHook("receipts.forBuyer");
export const useReceiptsForMerchant = queryHook("receipts.forMerchant");
export const useReceiptsForCampaign = queryHook("receipts.forCampaign");
