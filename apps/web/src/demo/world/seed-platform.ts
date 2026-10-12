import { seedClients, seedNetworks } from "./seed-platform-catalog";
import { seedCredentials } from "./seed-platform-credentials";
import { seedInsights } from "./seed-platform-insights";
import { seedOps } from "./seed-platform-ops";
import { seededRuns } from "./seed-platform-recon";
import type { DemoCore } from "./types";
import type { DemoWorld } from "./world";

export type PlatformSlice = Pick<
  DemoWorld,
  | "credentials"
  | "insights"
  | "opsCases"
  | "moderation"
  | "opsAudit"
  | "reconciliations"
  | "incidents"
  | "clients"
  | "networks"
>;

export const seedPlatform = (core: DemoCore): PlatformSlice => ({
  credentials: seedCredentials(core),
  insights: seedInsights(core),
  ...seedOps(core),
  reconciliations: seededRuns(core),
  clients: seedClients(core),
  networks: seedNetworks(core),
});
