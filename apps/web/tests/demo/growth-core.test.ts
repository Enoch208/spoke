import { hashPolicy } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import type { DemoSnapshot } from "../../src/demo/runtime/snapshot";
import { DAY, MINUTE, iso } from "../../src/demo/world/ids";
import { policyAt } from "../../src/demo/world/sale-math";
import { ANCHOR, createDemoTestClient } from "./harness";
import { growthCoreInputs, studioPolicy } from "./inputs-growth-core";

const merchantClient = () => createDemoTestClient({ persona: "merchant" });

const m1Sales = (world: ReturnType<typeof merchantClient>["runtime"]["world"]) =>
  world.sales.filter((sale) => ["demo-c-1", "demo-c-2", "demo-c-3"].includes(sale.campaignId));

const total = (values: readonly bigint[]) => values.reduce((sum, value) => sum + value, 0n);

describe("invitations", () => {
  it("seeds Mara's four invitations and one sent invitation of each status", async () => {
    const { client, runtime } = createDemoTestClient({ persona: "distributor" });
    const mine = await client["invitations.mine"]({});
    expect(new Set(mine.items.map((item) => item.status))).toEqual(
      new Set(["pending", "accepted", "expired", "withdrawn"]),
    );
    const pending = mine.items.find((item) => item.status === "pending");
    expect(pending?.campaignId).toBe("demo-c-5");
    expect(pending?.merchantId).toBe("demo-m-2");
    runtime.setPersona("merchant");
    const sent = await client["invitations.sent"]({});
    expect(sent.items.map((item) => item.status).sort()).toEqual([
      "accepted",
      "declined",
      "expired",
      "pending",
      "withdrawn",
    ]);
  });

  it("accepts a pending invitation once and refuses expired ones", async () => {
    const { client } = createDemoTestClient({ persona: "distributor" });
    const accepted = await client["invitations.respond"]({
      id: "demo-invitation-mara-pending",
      response: "accept",
    });
    expect(accepted.status).toBe("accepted");
    expect((await client["invitations.mine"]({ status: "pending" })).items).toEqual([]);
    await expect(
      client["invitations.respond"]({ id: "demo-invitation-mara-pending", response: "decline" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(
      client["invitations.respond"]({ id: "demo-invitation-mara-expired", response: "accept" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("expires a pending invitation on the simulated clock", async () => {
    const { client, advance } = createDemoTestClient({ persona: "distributor" });
    advance(6 * DAY);
    const mine = await client["invitations.mine"]({});
    expect(mine.items.find((item) => item.id === "demo-invitation-mara-pending")?.status).toBe(
      "expired",
    );
    await expect(
      client["invitations.respond"]({ id: "demo-invitation-mara-pending", response: "accept" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("sends with the campaign's current policy hash and withdraws", async () => {
    const { client, runtime } = merchantClient();
    const input = growthCoreInputs["invitations.send"];
    const sent = await client["invitations.send"](input);
    const campaign = runtime.world.campaigns.find((candidate) => candidate.id === "demo-c-1");
    expect(sent.status).toBe("pending");
    expect(campaign && sent.policyHash).toBe(campaign && policyAt(campaign, ANCHOR).hash);
    await expect(client["invitations.send"](input)).rejects.toMatchObject({ code: "CONFLICT" });
    const withdrawn = await client["invitations.withdraw"]({ id: sent.id });
    expect(withdrawn).toMatchObject({ status: "withdrawn", withdrawnAt: iso(ANCHOR) });
    expect(await client["invitations.withdraw"]({ id: sent.id })).toMatchObject({
      status: "withdrawn",
    });
  });

  it("refuses merchant methods for a persona without a business", async () => {
    const { client } = createDemoTestClient({ persona: "distributor" });
    await expect(client["invitations.sent"]({})).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
    await expect(client["analytics.merchant"]({})).rejects.toMatchObject({
      code: "NOT_AUTHORIZED",
    });
  });
});

describe("analytics", () => {
  it("builds 90 days of series that add up to the totals", async () => {
    const { client, runtime } = merchantClient();
    const analytics = await client["analytics.merchant"]({});
    expect(analytics.period).toEqual({ from: iso(ANCHOR - 90 * DAY), to: iso(ANCHOR) });
    expect(analytics.series).toHaveLength(91);
    const settled = m1Sales(runtime.world).filter(
      (sale) => sale.status === "FINALIZED" && sale.purchasedAt >= ANCHOR - 90 * DAY,
    );
    expect(analytics.totals.value).toBe(total(settled.map((sale) => sale.price)).toString());
    expect(total(analytics.series.map((point) => BigInt(point.value)))).toBe(
      BigInt(analytics.totals.value),
    );
    expect(total(analytics.byCampaign.map((row) => BigInt(row.totals.value)))).toBe(
      BigInt(analytics.totals.value),
    );
    const paid = settled.filter((sale) => sale.allocations.length > 0).length;
    expect(analytics.depthMix.reduce((sum, row) => sum + row.sales, 0)).toBe(paid);
    expect(analytics.funnel.map((stage) => stage.estimate)).toEqual([true, true, false, false]);
    expect(analytics.previousPeriodTotals).not.toBeNull();
  });

  it("honours compare, source, basis and campaign ownership", async () => {
    const { client } = merchantClient();
    expect(
      (await client["analytics.merchant"]({ compare: false })).previousPeriodTotals,
    ).toBeNull();
    const attested = await client["analytics.merchant"]({ source: "merchant_attested" });
    expect(attested.totals.value).toBe("0");
    const settled = await client["analytics.merchant"]({});
    const withPending = await client["analytics.merchant"]({ basis: "settled_and_pending" });
    expect(BigInt(withPending.totals.value)).toBeGreaterThan(BigInt(settled.totals.value));
    await expect(client["analytics.campaign"]({ campaignId: "demo-c-4" })).rejects.toMatchObject({
      code: "NOT_AUTHORIZED",
    });
  });
});

describe("reports", () => {
  it("reconciles the live campaigns and flags the drill campaign", async () => {
    const { client } = merchantClient();
    const all = await client["reports.preview"]({});
    expect(all.reconciliation.matches).toBe(false);
    expect(new Set(all.reconciliation.mismatches.map((row) => row.campaignId))).toEqual(
      new Set(["demo-c-3"]),
    );
    const live = await client["reports.preview"]({ campaignIds: ["demo-c-1", "demo-c-2"] });
    expect(live.reconciliation.matches).toBe(true);
    expect(live.reconciliation.rewardChain).toEqual(live.reconciliation.rewardIndex);
    await expect(client["reports.export"]({ kind: "sales", format: "csv" })).rejects.toMatchObject({
      code: "EXPORT_RECONCILIATION_MISMATCH",
    });
  });

  it("keeps three past exports, one expired, and appends new ones", async () => {
    const { client, advance } = merchantClient();
    const before = await client["reports.list"]({});
    expect(before.items).toHaveLength(3);
    expect(before.items.filter((run) => run.url === null)).toHaveLength(1);
    const ready = await client["reports.export"](growthCoreInputs["reports.export"]);
    expect(ready).toEqual({
      url: "https://usespoke.xyz/demo/exports/spoke-demo-SAMPLE-DATA-sales-1.csv",
    });
    const queued = await client["reports.export"]({
      kind: "vault",
      format: "csv",
      campaignIds: ["demo-c-1"],
    });
    expect(queued).toMatchObject({ status: "queued", url: null });
    const during = await client["reports.list"]({});
    expect(during.items).toHaveLength(5);
    expect(during.items[0]).toMatchObject({ kind: "vault", status: "queued", url: null });
    advance(5_000);
    const after = await client["reports.list"]({});
    expect(after.items[0]?.status).toBe("ready");
    expect(after.items[0]?.url).toMatch(/SAMPLE-DATA-vault-2\.csv$/);
  });
});

describe("studio", () => {
  it("serves the seven starting points and three sample families", async () => {
    const { client } = merchantClient();
    const templates = await client["studio.templates"]({});
    expect(templates.slice(0, 7).map((template) => template.name)).toEqual([
      "Developer tools",
      "Templates and kits",
      "Courses",
      "Research and reports",
      "Design assets",
      "Community access",
      "Testnet quick cycle",
    ]);
    const mine = templates.slice(7);
    expect(new Set(mine.map((template) => template.name)).size).toBe(3);
    expect(mine.filter((template) => template.status === "archived")).toHaveLength(2);
    await client["studio.saveTemplate"](growthCoreInputs["studio.saveTemplate"]);
    expect(await client["studio.templates"]({})).toHaveLength(templates.length + 1);
  });

  it("simulates with the protocol math (golden vectors)", async () => {
    const { client } = merchantClient();
    const result = await client["studio.simulate"](growthCoreInputs["studio.simulate"]);
    expect(result.policyHash).toBe(hashPolicy(studioPolicy));
    expect(result.simulations.map((row) => row.amounts)).toEqual([
      ["4000000"],
      ["2666800", "1333200"],
      ["2000000", "1000000", "600000", "400000"],
    ]);
    const unused = await client["studio.simulate"]({
      price: "40000000",
      policy: { ...studioPolicy, shortPathMode: "RETURN_UNUSED" },
      pathLengths: [1],
    });
    expect(unused.simulations[0]).toMatchObject({ amounts: ["2000000"], unallocated: "2000000" });
  });
});

describe("disputes", () => {
  it("seeds two open requests on sales closing in minutes and the exposure figures", async () => {
    const { client, runtime } = merchantClient();
    const requests = await client["disputes.list"]({ kind: "refund_request", status: "open" });
    expect(requests.items).toHaveLength(2);
    const unlocks = requests.items.map(
      (item) =>
        (runtime.world.sales.find((sale) => sale.id === item.saleId)?.unlockAt ?? 0) - ANCHOR,
    );
    expect(Math.min(...unlocks)).toBeLessThan(MINUTE);
    expect(Math.max(...unlocks)).toBeLessThanOrEqual(20 * MINUTE);
    expect(
      (await client["disputes.list"]({ status: "closed" })).items.length,
    ).toBeGreaterThanOrEqual(3);
    expect(await client["disputes.exposure"]({})).toEqual({
      openRefundRequests: 2,
      refundValue: "80000000",
      appeals: 2,
      chargebacks: 1,
      riskDebt: "12000000",
    });
  });

  it("lets the buyer open a request that reaches the merchant, with the sale guards", async () => {
    const { client, runtime, advance } = createDemoTestClient({ persona: "buyer" });
    const opened = await client["disputes.open"](growthCoreInputs["disputes.open"]);
    expect(opened.status).toBe("open");
    await expect(client["disputes.open"](growthCoreInputs["disputes.open"])).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const buyer = runtime.world.people.find((person) => person.id === "demo-buyer-persona")
      ?.addresses[0];
    const own = (status: string) =>
      runtime.world.sales.find((sale) => sale.buyer === buyer && sale.status === status)?.id ?? "";
    const message = "Please refund this order, it was not what I expected.";
    await expect(
      client["disputes.open"]({ saleId: own("FINALIZED"), reason: "Other", message }),
    ).rejects.toMatchObject({ code: "SALE_ALREADY_FINALIZED" });
    await expect(
      client["disputes.open"]({ saleId: own("REFUNDED"), reason: "Other", message }),
    ).rejects.toMatchObject({ code: "SALE_REFUNDED" });
    runtime.setPersona("merchant");
    expect((await client["disputes.exposure"]({})).openRefundRequests).toBe(3);
    expect((await client["disputes.get"]({ id: opened.disputeId })).kind).toBe("refund_request");
    advance(MINUTE);
    expect((await client["disputes.exposure"]({})).openRefundRequests).toBe(2);
    runtime.setPersona("buyer");
    advance(10 * MINUTE);
    await expect(
      client["disputes.open"]({ saleId: own("PENDING"), reason: "Other", message }),
    ).rejects.toMatchObject({ code: "REFUND_WINDOW_CLOSED" });
  });

  it("records outcomes and only marks refunded after the chain refund", async () => {
    const { client } = merchantClient();
    const message = "Recording our answer for this case.";
    await expect(
      client["disputes.respond"]({ id: "demo-dispute-request-open", outcome: "refunded", message }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    const declined = await client["disputes.respond"]({
      id: "demo-dispute-request-open",
      outcome: "declined",
      message,
    });
    expect(declined.status).toBe("declined");
    expect(declined.events.at(-1)?.kind).toBe("declined");
    await expect(
      client["disputes.respond"]({
        id: "demo-dispute-request-open",
        outcome: "explained",
        message,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await client["disputes.respond"]({
      id: "demo-dispute-chargeback-lost",
      outcome: "covered",
      message,
    });
    expect((await client["disputes.exposure"]({})).riskDebt).toBe("0");
  });
});

describe("billing", () => {
  it("shows no fees, sample totals and three no-charge statements", async () => {
    const { client, runtime } = merchantClient();
    const summary = await client["billing.summary"]({});
    expect(summary.feeBps).toBe(0);
    const settled = m1Sales(runtime.world).filter((sale) => sale.status === "FINALIZED");
    expect(summary.totals).toHaveLength(1);
    expect(summary.totals[0]).toMatchObject({
      settledValue: total(settled.map((sale) => sale.price)).toString(),
      protocolFees: "0",
    });
    const invoices = await client["billing.invoices"]({});
    expect(invoices.items.map((invoice) => invoice.period.from.slice(0, 7))).toEqual([
      "2026-09",
      "2026-08",
      "2026-07",
    ]);
    expect(invoices.items.every((invoice) => invoice.amount === "0" && invoice.url === null)).toBe(
      true,
    );
  });
});

describe("replay", () => {
  it("rebuilds the same growth state from the journal", async () => {
    let snapshot: DemoSnapshot | null = null;
    const first = createDemoTestClient({
      persona: "merchant",
      onChange: (next) => {
        snapshot = next;
      },
    });
    await first.client["invitations.send"](growthCoreInputs["invitations.send"]);
    await first.client["studio.saveTemplate"](growthCoreInputs["studio.saveTemplate"]);
    await first.client["reports.export"](growthCoreInputs["reports.export"]);
    await first.client["disputes.respond"](growthCoreInputs["disputes.respond"]);
    first.runtime.setPersona("buyer");
    await first.client["disputes.open"](growthCoreInputs["disputes.open"]);
    first.runtime.setPersona("distributor");
    await first.client["invitations.respond"](growthCoreInputs["invitations.respond"]);
    const second = createDemoTestClient({ snapshot });
    expect(second.runtime.restore()).toBe("restored");
    for (const key of ["invitations", "templates", "reports", "disputes"] as const)
      expect(second.runtime.world[key]).toEqual(first.runtime.world[key]);
  });
});
