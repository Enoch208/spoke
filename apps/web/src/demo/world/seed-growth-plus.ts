import type { GrowthPlusSlice } from "./seed-growth";
import { seedDeveloper } from "./seed-growth-plus-developer";
import { seedIntegrations } from "./seed-growth-plus-integrations";
import { seedCommunities, seedPartnerships } from "./seed-growth-plus-network";
import { seedSubscriptions } from "./seed-growth-plus-subscriptions";
import { seedTeam } from "./seed-growth-plus-team";
import type { DemoCore } from "./types";

export const seedGrowthPlus = (core: DemoCore): GrowthPlusSlice => ({
  ...seedIntegrations(core),
  ...seedDeveloper(core),
  ...seedTeam(core),
  subscriptions: seedSubscriptions(core),
  partnerships: seedPartnerships(core),
  ...seedCommunities(core),
});
