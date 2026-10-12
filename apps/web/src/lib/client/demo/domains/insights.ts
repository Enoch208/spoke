import { emptyInsights } from "../../../../demo/world/seed-platform-insights";
import type { DistributorInsights } from "../../../../demo/world/world";
import { fail, type PartialHandlers } from "../handler";
import { ownsAddress } from "../views/basics";

const copy = (insights: DistributorInsights): DistributorInsights => ({
  ...insights,
  labels: [...insights.labels],
  networks: [...insights.networks],
  activitySummary: insights.activitySummary ? { ...insights.activitySummary } : null,
  reviewSignals: insights.reviewSignals.map((signal) => ({ ...signal })),
});

export const insightsReads = {
  "insights.forDistributor": (input, runtime) => {
    const { world } = runtime;
    const me = runtime.personaId();
    const merchant = world.merchants.some(
      (candidate) => candidate.ownerId === me && candidate.closedAt === null,
    );
    if (!merchant && !ownsAddress(world, me, input.address))
      fail(
        "NOT_AUTHORIZED",
        "Insights are shown to merchants reviewing a distributor, and to the distributor themselves.",
      );
    const match = Object.entries(world.insights).find(
      ([address]) => address.toLowerCase() === input.address.toLowerCase(),
    );
    return match ? copy(match[1]) : emptyInsights("none", null);
  },
} satisfies PartialHandlers<"insights">;

export const insightsWrites = {} satisfies PartialHandlers<"insights">;
