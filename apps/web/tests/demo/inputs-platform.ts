import { sampleAddress } from "../../src/demo/world/ids";
import { seedCore } from "../../src/demo/world/seed";
import { seedCredentials } from "../../src/demo/world/seed-platform-credentials";
import { ANCHOR } from "./harness";
import type { MethodInputs, MethodPersonas } from "./inputs-types";

const issued = seedCredentials(seedCore(ANCHOR));
const activeCredential = issued.find((credential) => credential.status === "active");
if (!activeCredential) throw new RangeError("The sample world should issue an active credential.");

export const platformInputs = {
  "system.health": {},
  "system.status": {},
  "system.contracts": {},
  "system.endpoints": {},
  "system.events": { limit: 10 },
  "playground.run": { path: "/v1/campaigns/demo-c-1" },
  "clients.list": {},
  "networks.list": {},
  "tokens.list": {},
  "ops.queue": { limit: 10 },
  "ops.case": { id: "demo-case-2" },
  "ops.act": {
    id: "demo-case-2",
    action: {
      action: "addNote",
      revision: 3,
      reasonCategory: "Other",
      internalNote: "Checked the funding source again. No new transfers since the case opened.",
    },
  },
  "ops.moderation": {},
  "ops.audit": { limit: 50 },
  "ops.reconciliation": {},
  "ops.runReconciliation": {},
  "ops.incident": {
    title: "Sample incident · slow checkout",
    impact: "Checkout pages load slowly for some sample buyers.",
    severity: "degraded",
    publicMessage: "We're looking into slow checkout pages in the sample world.",
    status: "open",
  },
  "reputation.exportCredential": {},
  "reputation.credentials": {},
  "reputation.revokeCredential": { id: activeCredential.id },
  "reputation.verifyCredential": { credential: activeCredential },
  "insights.forDistributor": { address: sampleAddress("person:12") },
  "graph.export": {
    scope: "campaign",
    campaignId: "demo-c-1",
    depth: 8,
    saleStates: ["FINALIZED", "PENDING"],
    period: { from: "2026-07-01T00:00:00.000Z", to: "2026-10-12T12:00:00.000Z" },
    format: "csv",
  },
} satisfies MethodInputs;

export const platformPersonas = {
  "reputation.exportCredential": "distributor",
  "reputation.credentials": "distributor",
  "reputation.revokeCredential": "distributor",
  "reputation.verifyCredential": "distributor",
  "insights.forDistributor": "merchant",
  "graph.export": "merchant",
  "ops.act": "buyer",
} satisfies MethodPersonas;
