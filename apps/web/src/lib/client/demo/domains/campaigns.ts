import type { PartialHandlers } from "../handler";
import { campaignMerchantReads, campaignMerchantWrites } from "./campaigns-merchant";
import { campaignPublicReads } from "./campaigns-public";

export const campaignsReads = {
  ...campaignPublicReads,
  ...campaignMerchantReads,
} satisfies PartialHandlers<"campaigns">;

export const campaignsWrites = { ...campaignMerchantWrites } satisfies PartialHandlers<"campaigns">;
