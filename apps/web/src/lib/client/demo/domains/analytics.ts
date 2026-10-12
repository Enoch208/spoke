import type { PartialHandlers } from "../handler";
import { analyticsOf, includesPending, sourceFilter } from "./growth-analytics";
import { merchantFor, ownCampaign, periodOf, selectCampaigns } from "./growth-scope";

export const analyticsReads = {
  "analytics.merchant": (input, runtime) => {
    const merchant = merchantFor(runtime);
    return analyticsOf(runtime.world, {
      campaigns: selectCampaigns(runtime.world, merchant, input.campaignIds),
      period: periodOf(input.range, runtime.now()),
      source: sourceFilter(input.source),
      withPending: includesPending(input.basis),
      compare: input.compare ?? true,
      now: runtime.now(),
    });
  },
  "analytics.campaign": (input, runtime) => {
    const merchant = merchantFor(runtime);
    return analyticsOf(runtime.world, {
      campaigns: [ownCampaign(runtime.world, merchant, input.campaignId)],
      period: periodOf(input.range, runtime.now()),
      source: null,
      withPending: false,
      compare: true,
      now: runtime.now(),
    });
  },
} satisfies PartialHandlers<"analytics">;

export const analyticsWrites = {} satisfies PartialHandlers<"analytics">;
