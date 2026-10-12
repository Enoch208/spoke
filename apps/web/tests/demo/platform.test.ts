import { clientMethodSchemas, type ClientInput } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import type { DemoSnapshot } from "../../src/demo/runtime/snapshot";
import { DAY, sampleAddress } from "../../src/demo/world/ids";
import { auditHash } from "../../src/demo/world/seed-platform-audit";
import { DEMO_PROTOCOL_ADDRESS } from "../../src/lib/client/demo/views/basics";
import { ClientError } from "../../src/lib/client/errors";
import { createDemoTestClient } from "./harness";

const codeOf = async (call: Promise<unknown>) => {
  try {
    await call;
  } catch (error) {
    if (error instanceof ClientError) return error.code;
    throw error;
  }
  return null;
};

const note = (
  action: ClientInput<"ops.act">["action"]["action"],
  revision: number,
  publicNote?: string,
) => ({
  action,
  revision,
  reasonCategory: "Other",
  internalNote: `Sample operator note for ${action} in the platform test.`,
  ...(publicNote ? { publicNote } : {}),
});

describe("platform: networks, tokens, system and playground", () => {
  it("describes the demo world's networks and tokens", async () => {
    const { client } = createDemoTestClient();
    const networks = await client["networks.list"]({});
    expect(networks.map((network) => network.name)).toEqual([
      "Monad Testnet",
      "Sample Network A",
      "Sample Network B",
    ]);
    expect(networks[0]).toMatchObject({
      chainId: 10143,
      protocolAddress: DEMO_PROTOCOL_ADDRESS,
      status: "live",
    });
    expect(networks[0]?.allowedTokens.map((token) => token.symbol)).toEqual(["SDUSD", "SDEUR"]);
    expect(
      networks.slice(1).every((network) => network.explorer === null && network.status === "live"),
    ).toBe(true);
    const tokens = await client["tokens.list"]({});
    expect(tokens.find((token) => token.symbol === "SDEUR")?.label).toBe(
      "Sample second token · demo only, no value",
    );
  });

  it("reports a degraded indexer 14 blocks behind and a reserved-bucket mismatch", async () => {
    const { client } = createDemoTestClient();
    const health = await client["system.health"]({});
    expect([health.api, health.database, health.rpc, health.indexer.status]).toEqual([
      "ok",
      "ok",
      "ok",
      "degraded",
    ]);
    expect(BigInt(health.chainHead ?? "0") - BigInt(health.indexer.lastBlock ?? "0")).toBe(14n);
    const status = await client["system.status"]({});
    expect(status.indexer).toMatchObject({ state: "behind", lagBlocks: "14" });
    expect(status.reconciliation?.mismatches).toEqual([
      expect.objectContaining({ campaignId: "demo-c-3", field: "reserved" }),
    ]);
    expect(status.incidents.every((incident) => incident.endsAt !== null)).toBe(true);
    expect(await client["system.contracts"]({})).toEqual({ contracts: [] });
  });

  it("lists every designed endpoint and recent simulated events", async () => {
    const { client } = createDemoTestClient();
    const endpoints = await client["system.endpoints"]({});
    expect(endpoints).toHaveLength(Object.keys(clientMethodSchemas).length);
    expect(endpoints.every((endpoint) => endpoint.availability === "designed")).toBe(true);
    expect(endpoints).toContainEqual(
      expect.objectContaining({ method: "GET", path: "/v1/health", auth: "public" }),
    );
    const events = await client["system.events"]({ limit: 10 });
    expect(events).toHaveLength(10);
    expect(
      events.every(
        (row, index) =>
          index === 0 || Date.parse(events[index - 1]?.at ?? "") >= Date.parse(row.at),
      ),
    ).toBe(true);
    const refunds = await client["system.events"]({ name: "SaleRefunded", limit: 100 });
    expect(refunds.length).toBeGreaterThan(0);
    expect(refunds.every((row) => row.name === "SaleRefunded" && row.tx.explorerUrl === null)).toBe(
      true,
    );
  });

  it("answers allowlisted playground paths locally and 404s the rest", async () => {
    const { client } = createDemoTestClient();
    const health = await client["playground.run"]({ path: "/v1/health?verbose=1" });
    expect(health).toMatchObject({
      status: 200,
      durationMs: 0,
      headers: { "x-spoke-mode": "demo" },
    });
    expect(health.size).toBe(health.body.length);
    const campaign = await client["playground.run"]({ path: "/v1/campaigns/demo-c-1" });
    expect(JSON.parse(campaign.body)).toMatchObject({ data: { campaignId: "demo-c-1" } });
    expect((await client["playground.run"]({ path: "/v1/campaigns" })).status).toBe(200);
    expect((await client["playground.run"]({ path: "/v1/campaigns/demo-c-99" })).status).toBe(404);
    expect((await client["playground.run"]({ path: "/v1/me" })).status).toBe(404);
  });

  it("lists five sample clients across every type and use", async () => {
    const { client } = createDemoTestClient();
    const clients = await client["clients.list"]({});
    expect(clients).toHaveLength(5);
    expect(clients.every((row) => row.name.startsWith("Sample · "))).toBe(true);
    expect(new Set(clients.map((row) => row.type))).toEqual(
      new Set(["web", "widget", "sdk", "wallet"]),
    );
    expect(new Set(clients.flatMap((row) => row.uses))).toEqual(
      new Set(["Read API", "SDK", "Widgets", "Contracts directly"]),
    );
  });
});

describe("platform: ops console", () => {
  it("seeds six cases, the moderation tabs and a valid audit chain", async () => {
    const { client } = createDemoTestClient({ persona: "buyer" });
    const queue = await client["ops.queue"]({});
    expect(queue.items).toHaveLength(6);
    expect(new Set(queue.items.map((row) => row.category)).size).toBe(6);
    expect(queue.items.map((row) => row.id).slice(0, 2)).toEqual(["demo-case-4", "demo-case-2"]);
    const moderation = await client["ops.moderation"]({});
    expect(moderation.items.map((row) => row.category.split(" · ")[0]).sort()).toEqual([
      "Appeal",
      "Frozen",
      "Hidden",
      "Notice",
      "Report",
      "Report",
      "Report",
    ]);
    const audit = (await client["ops.audit"]({ limit: 100 })).items.reverse();
    expect(audit.length).toBeGreaterThanOrEqual(38);
    audit.forEach((entry, index) => {
      expect(entry.beforeHash).toBe(index === 0 ? null : audit[index - 1]?.afterHash);
      const { afterHash, ...content } = entry;
      expect(afterHash).toBe(auditHash(content));
    });
  });

  it("acts within the policy table, bumps revisions and fails stale writes", async () => {
    const { client } = createDemoTestClient();
    const before = (await client["ops.audit"]({ limit: 100 })).items.length;
    const noted = await client["ops.act"]({ id: "demo-case-2", action: note("addNote", 3) });
    expect(noted.revision).toBe(4);
    expect(noted.notes.at(-1)?.actor).toBe("Sample operator");
    expect((await client["ops.audit"]({ limit: 100 })).items).toHaveLength(before + 1);
    expect(await codeOf(client["ops.act"]({ id: "demo-case-2", action: note("addNote", 3) }))).toBe(
      "CONFLICT",
    );
    expect(
      await codeOf(client["ops.act"]({ id: "demo-case-2", action: note("requestInformation", 4) })),
    ).toBe("VALIDATION_FAILED");
    expect(
      await codeOf(client["ops.act"]({ id: "demo-case-5", action: note("hideFromDiscovery", 1) })),
    ).toBe("VALIDATION_FAILED");
    await client["ops.act"]({ id: "demo-case-2", action: note("hideFromDiscovery", 4) });
    const hidden = (await client["ops.moderation"]({})).items.find(
      (row) => row.id === "demo-case-2-hidden",
    );
    expect(hidden?.status).toBe("open");
    const restored = await client["ops.act"]({
      id: "demo-case-2-hidden",
      action: note("restore", 5),
    });
    expect(restored.revision).toBe(6);
    expect(
      (await client["ops.moderation"]({})).items.find((row) => row.id === "demo-case-2-hidden")
        ?.status,
    ).toBe("resolved");
  });

  it("opens and dismisses cases from reports", async () => {
    const { client } = createDemoTestClient();
    const opened = await client["ops.act"]({ id: "demo-report-2", action: note("openCase", 1) });
    expect(opened).toMatchObject({ id: "demo-report-2-case", status: "open", revision: 1 });
    const dismissed = await client["ops.act"]({
      id: "demo-report-3",
      action: note("dismissReport", 1),
    });
    expect(dismissed.status).toBe("closed");
    const rows = (await client["ops.moderation"]({})).items;
    expect(rows.find((row) => row.id === "demo-report-2")?.status).toBe("answered");
    expect(rows.find((row) => row.id === "demo-report-3")?.status).toBe("declined");
  });

  it("resolves the mismatch on a re-run and refuses a second run at the same moment", async () => {
    const { client, advance } = createDemoTestClient();
    const { runId } = await client["ops.runReconciliation"]({});
    expect(runId).toBe("demo-recon-17");
    expect((await client["system.status"]({})).reconciliation?.matches).toBe(true);
    expect(await codeOf(client["ops.runReconciliation"]({}))).toBe("CONFLICT");
    advance(1000);
    expect((await client["ops.runReconciliation"]({})).runId).toBe("demo-recon-18");
  });

  it("declares, updates and resolves incidents, and expires the sample freeze", async () => {
    const { client, advance } = createDemoTestClient();
    const declared = await client["ops.incident"]({
      title: "Sample incident · slow claims",
      impact: "Claims take longer to show in the sample world.",
      severity: "degraded",
      publicMessage: "We're looking into slow claims.",
      status: "open",
    });
    expect(declared.endsAt).toBeNull();
    const resolved = await client["ops.incident"]({
      ...declared,
      publicMessage: "Claims are back to normal.",
      status: "resolved",
    });
    expect(resolved.updates).toHaveLength(2);
    expect(resolved.endsAt).not.toBeNull();
    expect((await client["system.status"]({})).incidents[0]?.id).toBe(declared.id);
    advance(3 * DAY);
    const frozen = (await client["ops.moderation"]({})).items.find(
      (row) => row.id === "demo-case-4-frozen",
    );
    expect(frozen?.status).toBe("resolved");
  });
});

describe("platform: credentials, insights and graph export", () => {
  it("issues credentials from Mara's settled record and round-trips verification", async () => {
    const { client, runtime } = createDemoTestClient({ persona: "distributor" });
    const seeded = await client["reputation.credentials"]({});
    expect(seeded.map((credential) => credential.status).sort()).toEqual(["active", "revoked"]);
    const mara = runtime.world.people[0]?.addresses ?? [];
    const settled = runtime.world.sales.filter(
      (sale) =>
        sale.status === "FINALIZED" &&
        sale.allocations.some((allocation) => mara.includes(allocation.owner)),
    );
    const issued = await client["reputation.exportCredential"]({});
    expect(issued.metrics.settledConversions).toBe(settled.length);
    expect(issued.metrics.netAttributedValue).toBe(
      settled.reduce((sum, sale) => sum + sale.price, 0n).toString(),
    );
    expect(issued.metrics.merchantCount).toBe(2);
    expect(issued.issuerSignature.startsWith("0x64656d6f")).toBe(true);
    expect((await client["reputation.verifyCredential"]({ credential: issued })).valid).toBe(true);
    const tampered = { ...issued, metrics: { ...issued.metrics, settledConversions: 999 } };
    expect(
      (await client["reputation.verifyCredential"]({ credential: tampered })).checks
        .issuerSignature,
    ).toBe(false);
    await client["reputation.revokeCredential"]({ id: issued.id });
    const after = await client["reputation.verifyCredential"]({ credential: issued });
    expect(after).toMatchObject({
      valid: false,
      checks: { revocation: false, issuerSignature: true },
    });
    runtime.setPersona("merchant");
    expect(await codeOf(client["reputation.exportCredential"]({}))).toBe("NOT_ELIGIBLE");
  });

  it("serves sample insights for ten distributors and none elsewhere", async () => {
    const { client, runtime } = createDemoTestClient({ persona: "merchant" });
    const all = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        client["insights.forDistributor"]({
          address: sampleAddress(`person:${String(index + 1)}`),
        }),
      ),
    );
    expect(all.filter((row) => row.status === "available")).toHaveLength(10);
    expect(all.filter((row) => row.reviewSignals.length > 0)).toHaveLength(2);
    expect([all[3]?.status, all[5]?.status, all[39]?.status]).toEqual([
      "no_history",
      "none",
      "none",
    ]);
    expect(
      all.every(
        (row) =>
          row.scopeNote === "Sample wallet context. Not real data and not from any provider.",
      ),
    ).toBe(true);
    expect(JSON.stringify(all)).not.toMatch(/nansen/i);
    runtime.setPersona("buyer");
    expect(
      await codeOf(client["insights.forDistributor"]({ address: sampleAddress("person:1") })),
    ).toBe("NOT_AUTHORIZED");
  });

  it("exports a manifest over the sample graph", async () => {
    const { client } = createDemoTestClient();
    const period = { from: "2026-01-01T00:00:00.000Z", to: "2026-10-12T12:00:00.000Z" };
    const input = {
      scope: "campaign",
      campaignId: "demo-c-1",
      depth: 8,
      saleStates: ["FINALIZED"],
      period,
      format: "csv",
    } as const;
    const manifest = await client["graph.export"]({ ...input, saleStates: [...input.saleStates] });
    expect(manifest).toMatchObject({ schemaVersion: "demo-1", chainId: 10143 });
    expect(manifest.files.map((file) => file.rows).slice(0, 2)).toEqual([42, 40]);
    expect(
      manifest.files.every((file) => file.url.startsWith("https://usespoke.xyz/demo/exports/")),
    ).toBe(true);
    expect(manifest.files.every((file) => /^[\da-f]{64}$/.test(file.sha256))).toBe(true);
    const roots = await client["graph.export"]({ ...input, depth: 1, saleStates: [] });
    expect(roots.files.map((file) => file.rows)).toEqual([2, 0, 0]);
    expect(
      await codeOf(client["graph.export"]({ ...input, campaignId: undefined, saleStates: [] })),
    ).toBe("VALIDATION_FAILED");
  });
});

describe("platform: replay", () => {
  it("replays ops and credential writes to the same world", async () => {
    let snapshot: DemoSnapshot | null = null;
    const first = createDemoTestClient({
      persona: "distributor",
      onChange: (next) => (snapshot = next),
    });
    await first.client["ops.act"]({ id: "demo-case-6", action: note("assign", 1) });
    await first.client["ops.runReconciliation"]({});
    const issued = await first.client["reputation.exportCredential"]({});
    await first.client["reputation.revokeCredential"]({ id: "demo-cred-2" });
    const second = createDemoTestClient({ snapshot });
    expect(second.runtime.restore()).toBe("restored");
    expect(await second.client["ops.case"]({ id: "demo-case-6" })).toEqual(
      await first.client["ops.case"]({ id: "demo-case-6" }),
    );
    expect(await second.client["ops.audit"]({ limit: 100 })).toEqual(
      await first.client["ops.audit"]({ limit: 100 }),
    );
    second.runtime.setPersona("distributor");
    const credentials = await second.client["reputation.credentials"]({});
    expect(credentials.find((credential) => credential.id === issued.id)).toEqual(issued);
    expect(credentials.find((credential) => credential.id === "demo-cred-2")?.status).toBe(
      "revoked",
    );
  });
});
