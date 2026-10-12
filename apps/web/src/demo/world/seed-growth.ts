import { seedGrowthCore } from "./seed-growth-core";
import { seedGrowthPlus } from "./seed-growth-plus";
import type { DemoCore } from "./types";
import type { DemoWorld } from "./world";

export type GrowthCoreSlice = Pick<DemoWorld, "invitations" | "templates" | "reports" | "disputes">;

export type GrowthPlusSlice = Pick<
  DemoWorld,
  | "integrations"
  | "integrationStatus"
  | "signers"
  | "attestations"
  | "apiKeys"
  | "apiUsage"
  | "webhooks"
  | "deliveries"
  | "team"
  | "audit"
  | "subscriptions"
  | "partnerships"
  | "communities"
  | "communityMembers"
>;

export const seedGrowth = (core: DemoCore): GrowthCoreSlice & GrowthPlusSlice => ({
  ...seedGrowthCore(core),
  ...seedGrowthPlus(core),
});
