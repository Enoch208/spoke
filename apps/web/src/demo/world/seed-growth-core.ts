import type { GrowthCoreSlice } from "./seed-growth";
import { seedDisputes } from "./seed-growth-core-disputes";
import { seedInvitations } from "./seed-growth-core-invitations";
import { seedReports } from "./seed-growth-core-reports";
import { seedTemplates } from "./seed-growth-core-templates";
import type { DemoCore } from "./types";

export const seedGrowthCore = (core: DemoCore): GrowthCoreSlice => ({
  invitations: seedInvitations(core),
  templates: seedTemplates(core),
  reports: seedReports(core),
  disputes: seedDisputes(core),
});
