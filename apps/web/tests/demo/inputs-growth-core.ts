import { zeroHash } from "viem";
import { tokens } from "../../src/demo/world/catalog";
import { seedCore } from "../../src/demo/world/seed";
import { ANCHOR } from "./harness";
import type { MethodInputs, MethodPersonas } from "./inputs-types";

const world = seedCore(ANCHOR);
const person = (id: string) =>
  world.people.find((candidate) => candidate.id === id)?.addresses[0] ?? zeroHash.slice(0, 42);
const buyer = person("demo-buyer-persona");
const buyerPendingSale =
  world.sales.find(
    (sale) => sale.buyer === buyer && sale.status === "PENDING" && sale.campaignId === "demo-c-1",
  )?.id ?? "demo-s-191";

export const studioPolicy = {
  rewardToken: tokens.sdusd.address,
  commissionBps: 1000,
  perSaleCap: "5000000",
  campaignLiabilityCap: "500000000",
  maxRewardedAncestors: 4,
  weightsBps: [5000, 2500, 1500, 1000],
  shortPathMode: "RENORMALIZE_EXISTING" as const,
  holdSeconds: 600,
  expiry: "0",
  eligibilityHash: zeroHash,
};

export const growthCoreInputs = {
  "invitations.mine": { status: "pending" },
  "invitations.sent": {},
  "invitations.send": {
    distributor: person("demo-u-38"),
    campaignId: "demo-c-1",
    message: "Your dev tools threads would suit the invoice pack.",
    terms: "25% commission · 4 people paid (50/25/15/10) · 1-day hold",
    expiresAt: "2026-10-26T12:00:00.000Z",
  },
  "invitations.respond": { id: "demo-invitation-mara-pending", response: "accept" },
  "invitations.withdraw": { id: "demo-invitation-northbeam-pending" },
  "analytics.merchant": {},
  "analytics.campaign": { campaignId: "demo-c-1" },
  "reports.export": { kind: "sales", format: "csv", campaignIds: ["demo-c-1"] },
  "reports.preview": {},
  "reports.list": {},
  "studio.templates": {},
  "studio.saveTemplate": { name: "Quick cycle · four levels", policy: studioPolicy },
  "studio.simulate": { price: "40000000", policy: studioPolicy, pathLengths: [1, 2, 4] },
  "disputes.open": {
    saleId: buyerPendingSale,
    reason: "Bought by mistake",
    message: "I bought the pack twice by mistake. Please refund this copy.",
  },
  "disputes.list": {},
  "disputes.get": { id: "demo-dispute-request-closing" },
  "disputes.respond": {
    id: "demo-dispute-request-open",
    outcome: "declined",
    message: "All twelve layouts are in the second folder of the download.",
  },
  "disputes.exposure": {},
  "billing.summary": {},
  "billing.invoices": {},
} satisfies MethodInputs;

export const growthCorePersonas = {
  "invitations.mine": "distributor",
  "invitations.respond": "distributor",
  "invitations.sent": "merchant",
  "invitations.send": "merchant",
  "invitations.withdraw": "merchant",
  "analytics.merchant": "merchant",
  "analytics.campaign": "merchant",
  "reports.export": "merchant",
  "reports.preview": "merchant",
  "reports.list": "merchant",
  "studio.templates": "merchant",
  "studio.saveTemplate": "merchant",
  "studio.simulate": "merchant",
  "disputes.open": "buyer",
  "disputes.list": "merchant",
  "disputes.get": "merchant",
  "disputes.respond": "merchant",
  "disputes.exposure": "merchant",
  "billing.summary": "merchant",
  "billing.invoices": "merchant",
} satisfies MethodPersonas;
