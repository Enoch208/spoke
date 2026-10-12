import { mutationHook, queryHook } from "../use-client";

export const useMerchantsGet = queryHook("merchants.get");
export const useMerchantsRecord = queryHook("merchants.record");
export const useMerchantsMe = queryHook("merchants.me");
export const useMerchantsSetupMutation = mutationHook("merchants.setup", ["merchants", "account"]);
export const useMerchantsUpdateMutation = mutationHook("merchants.update", [
  "merchants",
  "campaigns",
]);
export const useMerchantsSlugAvailable = queryHook("merchants.slugAvailable");
export const useMerchantsUploadLogoMutation = mutationHook("merchants.uploadLogo", ["merchants"]);
export const useMerchantsRequestVerificationMutation = mutationHook(
  "merchants.requestVerification",
  ["merchants"],
);
export const useMerchantsCloseMutation = mutationHook("merchants.close", [
  "merchants",
  "account",
  "campaigns",
]);
export const useMerchantsOffers = queryHook("merchants.offers");
