import { describe, expect, it } from "vitest";
import { DAY, HOUR, MINUTE, iso, sampleAddress } from "../../src/demo/world/ids";
import { MAX_DELIVERY_ATTEMPTS } from "../../src/demo/world/seed-growth-plus-developer";
import { units } from "../../src/demo/world/catalog";
import {
  rejectionReasonsFor,
  signerLabelsFor,
} from "../../src/demo/world/seed-growth-plus-signers";
import { teamTitlesFor } from "../../src/demo/world/seed-growth-plus-team";
import { inviteCodeOf } from "../../src/lib/client/demo/domains/communities";
import { inviteExpiresAt } from "../../src/lib/client/demo/domains/team";
import { ClientError } from "../../src/lib/client/errors";
import { ANCHOR, createDemoTestClient } from "./harness";

const M = "demo-m-1";

const codeOf = async (call: Promise<unknown>) => {
  try {
    await call;
  } catch (error) {
    if (error instanceof ClientError) return error.code;
    throw error;
  }
  return null;
};

const merchant = () => createDemoTestClient({ persona: "merchant" });

describe("growth plus: integrations and order signers", () => {
  it("seeds Shopify healthy, WooCommerce needing attention and Stripe not connected", async () => {
    const { client } = merchant();
    const list = await client["integrations.list"]({});
    expect(list.map((item) => [item.provider, item.status, item.connectedAt === null])).toEqual([
      ["shopify", "connected", false],
      ["woocommerce", "error", false],
      ["stripe", "disconnected", true],
    ]);
    const shopify = await client["integrations.status"]({ provider: "shopify" });
    expect(shopify.mismatches).toEqual([]);
    expect(shopify.sourceTotal).toBe(shopify.attestedTotal);
    expect(shopify.attestedTotal).toBe(shopify.acceptedTotal);
    expect(BigInt(shopify.acceptedTotal)).toBeGreaterThan(0n);
    const woo = await client["integrations.reconciliation"]({ provider: "woocommerce" });
    expect(woo.mismatches.map((mismatch) => mismatch.kind)).toEqual([
      "refundUnresolved",
      "amountMismatch",
    ]);
    expect(BigInt(woo.sourceTotal) - BigInt(woo.attestedTotal)).toBe(units(2));
    expect(BigInt(woo.acceptedTotal)).toBeLessThan(BigInt(woo.attestedTotal));
    expect(woo.pendingOrders).toBe(1);
  });

  it("connects Stripe end to end and records it in the audit log", async () => {
    const { client } = merchant();
    const connected = await client["integrations.connect"]({ provider: "stripe" });
    expect(connected).toMatchObject({ status: "connected", connectedAt: iso(ANCHOR) });
    const status = await client["integrations.status"]({ provider: "stripe" });
    expect([status.sourceTotal, status.attestedTotal, status.acceptedTotal]).toEqual([
      "0",
      "0",
      "0",
    ]);
    const audit = await client["team.audit"]({ limit: 1 });
    expect(audit.items[0]).toMatchObject({ action: "integrations.connect", role: "Owner" });
    await client["integrations.disconnect"]({ provider: "stripe" });
    const after = await client["integrations.list"]({});
    expect(after.find((item) => item.provider === "stripe")?.status).toBe("disconnected");
  });

  it("refreshes the sync at most once a minute and keeps it a read", async () => {
    const { client, advance } = merchant();
    const before = await client["integrations.status"]({ provider: "shopify" });
    expect(before.lastSyncAt).toBe(iso(ANCHOR - 4 * MINUTE));
    advance(90_000);
    const refreshed = await client["integrations.status"]({ provider: "shopify", refresh: true });
    expect(refreshed.lastSyncAt).toBe(iso(ANCHOR + MINUTE));
    advance(20 * MINUTE);
    const scheduled = await client["integrations.status"]({ provider: "shopify" });
    expect(scheduled.lastSyncAt).toBe(iso(ANCHOR + 11 * MINUTE));
  });

  it("marks a difference as explained without moving money", async () => {
    const { client } = merchant();
    const before = await client["integrations.reconciliation"]({ provider: "woocommerce" });
    const entry = await client["integrations.resolveMismatch"]({
      id: `${M}-mismatch-2`,
      note: "The store total includes a shipping line the signer leaves out.",
    });
    expect(entry).toMatchObject({
      action: "integrations.resolveMismatch",
      resource: `${M}-mismatch-2`,
    });
    const after = await client["integrations.reconciliation"]({ provider: "woocommerce" });
    expect(after.mismatches).toHaveLength(1);
    expect([after.sourceTotal, after.attestedTotal]).toEqual([
      before.sourceTotal,
      before.attestedTotal,
    ]);
  });

  it("seeds the three signers and every attempt outcome", async () => {
    const { client } = merchant();
    const { items, policy } = await client["signers.list"]({});
    const labels = signerLabelsFor(M);
    expect(items.map((signer) => labels[signer.id])).toEqual([
      "Shopify production",
      "Old WooCommerce key",
      "WooCommerce store key",
    ]);
    const [shopify, old, expiring] = items;
    expect(
      Number((BigInt(shopify?.usedToday ?? "0") * 100n) / BigInt(shopify?.limits.daily ?? "1")),
    ).toBe(60);
    expect(old?.revokedAt).toBe(iso(ANCHOR - 7 * DAY));
    expect(Date.parse(expiring?.expiry ?? "") - ANCHOR).toBe(5 * DAY);
    expect(policy).toMatchObject({
      maxValiditySeconds: 900,
      domain: { name: "Spoke", chainId: 10143 },
    });
    const attempts = await client["signers.attestations"]({ id: `${M}-signer-3`, limit: 100 });
    expect(new Set(attempts.items.map((attempt) => attempt.outcome))).toEqual(
      new Set(["accepted", "rejected", "pending"]),
    );
    const reasons = rejectionReasonsFor(M);
    const rejected = await client["signers.attestations"]({
      id: `${M}-signer-3`,
      outcome: "rejected",
    });
    const old2 = await client["signers.attestations"]({ id: `${M}-signer-2`, outcome: "rejected" });
    expect(
      new Set([...rejected.items, ...old2.items].map((attempt) => reasons[attempt.id])),
    ).toEqual(new Set(Object.values(reasons)));
    const target = attempts.items[0];
    const byNonce = await client["signers.attestations"]({
      id: `${M}-signer-3`,
      nonce: target?.nonce ?? "0",
    });
    expect(byNonce.items.map((attempt) => attempt.id)).toEqual([target?.id]);
    const unused = await client["signers.attestations"]({ id: `${M}-signer-3`, nonce: "1" });
    expect(unused.items).toEqual([]);
  });

  it("adds and revokes a signer, refusing a second revoke", async () => {
    const { client } = merchant();
    const added = await client["signers.add"]({
      address: sampleAddress("test:signer"),
      scopes: ["provider:stripe"],
      limits: { perOrder: "50000000", daily: "500000000" },
      expiry: iso(ANCHOR + 90 * DAY),
    });
    expect(added).toMatchObject({ revokedAt: null, usedToday: "0" });
    const revoked = await client["signers.revoke"]({ id: added.id });
    expect(revoked.revokedAt).toBe(iso(ANCHOR));
    expect(await codeOf(client["signers.revoke"]({ id: added.id }))).toBe("CONFLICT");
    const tooLong = client["signers.add"]({
      address: sampleAddress("test:signer-2"),
      scopes: ["provider:stripe"],
      limits: { perOrder: "1", daily: "1" },
      expiry: iso(ANCHOR + 400 * DAY),
    });
    expect(await codeOf(tooLong)).toBe("VALIDATION_FAILED");
  });

  it("refuses a persona without a business", async () => {
    const { client } = createDemoTestClient({ persona: "distributor" });
    expect(await codeOf(client["integrations.list"]({}))).toBe("NOT_AUTHORIZED");
    expect(await codeOf(client["team.members"]({}))).toBe("NOT_AUTHORIZED");
  });
});

describe("growth plus: API keys and webhooks", () => {
  it("seeds the reporting job and the revoked staging key with usage", async () => {
    const { client } = merchant();
    const keys = await client["apiKeys.list"]({});
    expect(keys.map((key) => [key.scopes, key.lastUsedAt, key.revokedAt === null])).toEqual([
      [["sales:read", "reports:read"], iso(ANCHOR - 3 * HOUR), true],
      [["campaigns:read", "drafts:write"], iso(ANCHOR - 40 * DAY), false],
    ]);
    const usage = await client["apiKeys.usage"]({ id: `${M}-key-1` });
    expect(usage.requests.length).toBeLessThanOrEqual(50);
    expect(usage.requests.every((request) => request.requestId.startsWith("demo-req-"))).toBe(true);
    expect(usage.hourly.reduce((total, bucket) => total + bucket.count, 0)).toBe(
      usage.requests.length,
    );
    expect(new Set(usage.requests.map((request) => request.status))).toEqual(
      new Set([200, 202, 404, 429, 500]),
    );
  });

  it("returns the key secret once and keeps only the prefix", async () => {
    const { client } = merchant();
    const created = await client["apiKeys.create"]({
      confirmationToken: "demo-step-up-confirmation-token-0123456789",
      name: "Nightly export",
      scopes: ["sales:read", "sales:read"],
    });
    expect(created.secret).toMatch(/^spk_demo_[0-9a-f]{64}$/);
    expect(created.secret.startsWith(created.prefix)).toBe(true);
    expect(created.scopes).toEqual(["sales:read"]);
    const listed = await client["apiKeys.list"]({});
    expect(JSON.stringify(listed)).not.toContain(created.secret);
    await client["apiKeys.revoke"]({ id: created.id });
    expect(await codeOf(client["apiKeys.revoke"]({ id: created.id }))).toBe("CONFLICT");
    const unknownScope = client["apiKeys.create"]({
      confirmationToken: "demo-step-up-confirmation-token-0123456789",
      name: "Bad",
      scopes: ["money:move"],
    });
    expect(await codeOf(unknownScope)).toBe("VALIDATION_FAILED");
  });

  it("seeds seven days of deliveries with one retrying and one dead-lettered", async () => {
    const { client } = merchant();
    const [endpoint] = await client["webhooks.list"]({});
    expect(endpoint?.events).toEqual([
      "sale.pending",
      "sale.finalized",
      "sale.refunded",
      "campaign.budget_low",
    ]);
    const log = await client["webhooks.deliveries"]({ id: `${M}-hook-1`, limit: 100 });
    expect(log.items.every((delivery) => Date.parse(delivery.createdAt) >= ANCHOR - 7 * DAY)).toBe(
      true,
    );
    const retrying = log.items.filter(
      (delivery) => delivery.status === "failed" && delivery.nextAttemptAt !== null,
    );
    const dead = log.items.filter(
      (delivery) => delivery.status === "failed" && delivery.nextAttemptAt === null,
    );
    expect(retrying).toHaveLength(1);
    expect(dead.map((delivery) => delivery.attempt)).toEqual([MAX_DELIVERY_ATTEMPTS]);
    expect(log.items.some((delivery) => delivery.eventId.endsWith("budget-low"))).toBe(true);
  });

  it("replays a dead-lettered delivery with the same event id and refuses a retrying one", async () => {
    const { client, advance } = merchant();
    const log = await client["webhooks.deliveries"]({ id: `${M}-hook-1`, limit: 100 });
    const dead = log.items.find(
      (delivery) => delivery.status === "failed" && delivery.nextAttemptAt === null,
    );
    const retrying = log.items.find(
      (delivery) => delivery.status === "failed" && delivery.nextAttemptAt !== null,
    );
    const replayed = await client["webhooks.replay"]({ id: dead?.id ?? "" });
    expect(replayed).toMatchObject({ eventId: dead?.eventId, status: "queued", attempt: 1 });
    expect(await codeOf(client["webhooks.replay"]({ id: retrying?.id ?? "" }))).toBe("CONFLICT");
    advance(5_000);
    const after = await client["webhooks.deliveries"]({ id: `${M}-hook-1`, limit: 1 });
    expect(after.items[0]).toMatchObject({ id: replayed.id, status: "delivered", httpStatus: 200 });
    const test = await client["webhooks.test"]({ id: `${M}-hook-1` });
    expect(test).toMatchObject({ status: "delivered", attempt: 1 });
  });

  it("refuses private webhook hosts and rotates secrets with a 24 hour overlap", async () => {
    const { client } = merchant();
    for (const url of [
      "https://localhost/hook",
      "https://10.1.2.3/hook",
      "https://[::1]/hook",
      "https://printer.local/x",
    ])
      expect(await codeOf(client["webhooks.create"]({ url, events: ["sale.pending"] }))).toBe(
        "WEBHOOK_URL_NOT_ALLOWED",
      );
    expect(
      await codeOf(
        client["webhooks.create"]({ url: "http://hooks.example.com/x", events: ["sale.pending"] }),
      ),
    ).toBe("VALIDATION_FAILED");
    const created = await client["webhooks.create"]({
      url: "https://hooks.example.com/b",
      events: ["sale.pending"],
    });
    expect(created.secret).toMatch(/^whsec_demo_/);
    const first = await client["webhooks.rotateSecret"]({ id: created.id });
    const second = await client["webhooks.rotateSecret"]({ id: created.id });
    expect(first.oldSecretExpiresAt).toBe(iso(ANCHOR + DAY));
    expect(new Set([created.secret, first.secret, second.secret]).size).toBe(3);
  });

  it("removing an endpoint cancels its pending retries and keeps the log", async () => {
    const { client } = merchant();
    await client["webhooks.remove"]({ id: `${M}-hook-1` });
    expect(await client["webhooks.list"]({})).toEqual([]);
    const log = await client["webhooks.deliveries"]({ id: `${M}-hook-1`, limit: 100 });
    expect(log.items.some((delivery) => delivery.status === "cancelled")).toBe(true);
    expect(log.items.some((delivery) => delivery.nextAttemptAt !== null)).toBe(false);
    expect(await codeOf(client["webhooks.update"]({ id: `${M}-hook-1`, enabled: true }))).toBe(
      "NOT_FOUND",
    );
  });
});

describe("growth plus: team and audit", () => {
  it("seeds five members, a pending invite and an expired invite", async () => {
    const { client, runtime } = merchant();
    const members = await client["team.members"]({});
    const titles = teamTitlesFor(M);
    const active = members.filter((member) => member.status === "active");
    expect(active.map((member) => [titles[member.id], member.role])).toEqual([
      ["Owner", "owner"],
      ["Admin", "admin"],
      ["Finance", "analyst"],
      ["Developer", "analyst"],
      ["Support", "viewer"],
    ]);
    expect(active[0]?.address).toBe(
      runtime.world.people.find((p) => p.id === "demo-owner-1")?.addresses[0],
    );
    const invites = members.filter((member) => member.status === "invited");
    const expiries = invites.map((member) => inviteExpiresAt(runtime.world, member) ?? 0);
    expect(expiries.map((at) => at > ANCHOR)).toEqual([true, false]);
    expect(expiries[0]).toBe(ANCHOR - 2 * DAY - 17 * 11 * MINUTE + 7 * DAY);
  });

  it("keeps 30 days of audit entries covering every action type", async () => {
    const { client } = merchant();
    const { items } = await client["team.audit"]({ limit: 100 });
    expect(items.every((entry) => Date.parse(entry.at) >= ANCHOR - 30 * DAY)).toBe(true);
    expect(new Set(items.map((entry) => entry.action.split(".")[0]))).toEqual(
      new Set([
        "team",
        "apiKeys",
        "webhooks",
        "signers",
        "integrations",
        "merchants",
        "reports",
        "disputes",
      ]),
    );
    expect(new Set(items.map((entry) => entry.role))).toEqual(
      new Set(["Owner", "Admin", "Finance", "Developer", "Support"]),
    );
  });

  it("invites, changes roles, removes and transfers ownership with audit entries", async () => {
    const { client, runtime } = merchant();
    const admin = sampleAddress("team:demo-m-1:2");
    expect(await codeOf(client["team.invite"]({ address: admin, role: "viewer" }))).toBe(
      "TEAM_ALREADY_MEMBER",
    );
    const own = runtime.world.merchants.find((m) => m.id === M)?.address ?? admin;
    expect(await codeOf(client["team.invite"]({ address: own, role: "viewer" }))).toBe(
      "VALIDATION_FAILED",
    );
    const invited = await client["team.invite"]({
      address: sampleAddress("test:mate"),
      role: "analyst",
    });
    expect(invited).toMatchObject({ status: "invited", joinedAt: null });
    await client["team.updateRole"]({ id: `${M}-member-3`, role: "viewer" });
    await client["team.remove"]({ id: `${M}-member-5` });
    const members = await client["team.members"]({});
    expect(members.find((member) => member.id === `${M}-member-3`)?.role).toBe("viewer");
    expect(members.some((member) => member.id === `${M}-member-5`)).toBe(false);
    await client["team.transferOwnership"]({
      address: admin,
      confirmationToken: "demo-step-up-confirmation-token-0123456789",
    });
    const after = await client["team.members"]({});
    expect(
      after.filter((member) => member.role === "owner").map((member) => member.address),
    ).toEqual([admin]);
    expect(runtime.world.merchants.find((m) => m.id === M)?.ownerId).toBe("demo-owner-1");
    const audit = await client["team.audit"]({ limit: 4 });
    expect(audit.items.map((entry) => entry.action)).toEqual([
      "team.transferOwnership",
      "team.remove",
      "team.updateRole",
      "team.invite",
    ]);
  });
});

describe("growth plus: subscriptions", () => {
  const statusOf = (
    subscriber: { nextRenewalAt: string | null; rewards: string; cap: string },
    now: number,
  ) => {
    if (subscriber.nextRenewalAt === null) return "cancelled";
    if (Date.parse(subscriber.nextRenewalAt) < now) return "paymentFailed";
    return subscriber.rewards === subscriber.cap ? "rewardsEnded" : "active";
  };

  it("seeds the monthly plan with subscribers in every status and a draft plan", async () => {
    const { client, runtime } = merchant();
    const { items } = await client["subscriptions.list"]({});
    expect(items.map((plan) => [plan.name, plan.billingPeriod, plan.subscribers.length])).toEqual([
      ["Sample · Pro templates monthly", "monthly", 8],
      ["Sample · Pro templates yearly", "yearly", 0],
    ]);
    const [plan, draft] = items;
    expect(plan?.campaignId).toBe("demo-c-8");
    expect(runtime.world.campaigns.some((campaign) => campaign.id === draft?.campaignId)).toBe(
      false,
    );
    expect(new Set(plan?.subscribers.map((subscriber) => statusOf(subscriber, ANCHOR)))).toEqual(
      new Set(["active", "rewardsEnded", "cancelled", "paymentFailed"]),
    );
    expect(plan?.subscribers.every((subscriber) => subscriber.cap === units(6).toString())).toBe(
      true,
    );
    const settled = plan?.series.reduce((total, point) => total + point.sales.finalized, 0) ?? 0;
    const refunded = plan?.series.reduce((total, point) => total + point.sales.refunded, 0) ?? 0;
    expect([settled > 0, refunded]).toEqual([true, 1]);
  });

  it("matures renewals on the simulated clock and pays only up to the cap", async () => {
    const { client, advance } = merchant();
    const before = await client["subscriptions.get"]({ id: `${M}-plan-1` });
    const nearCap = before.subscribers.find((subscriber) => subscriber.renewalCount === 5);
    const failed = before.subscribers.find(
      (subscriber) => statusOf(subscriber, ANCHOR) === "paymentFailed",
    );
    expect(nearCap?.rewards).toBe(units(5, 40).toString());
    advance(3 * DAY);
    const after = await client["subscriptions.get"]({ id: `${M}-plan-1` });
    const matured = after.subscribers.find((subscriber) => subscriber.id === nearCap?.id);
    expect(matured).toMatchObject({ renewalCount: 6, rewards: units(6).toString() });
    expect(after.subscribers.find((subscriber) => subscriber.id === failed?.id)).toEqual(failed);
    const pending = (series: typeof before.series) =>
      series.reduce((total, point) => total + point.sales.pending, 0);
    expect(pending(after.series)).toBeGreaterThan(pending(before.series));
  });

  it("saves drafts and refuses to change a live plan's billing period", async () => {
    const { client } = merchant();
    const saved = await client["subscriptions.save"]({
      id: `${M}-plan-2`,
      campaignId: `${M}-plan-2-draft`,
      name: "Sample · Pro templates yearly (billing provider)",
      billingPeriod: "yearly",
    });
    expect(saved.name).toBe("Sample · Pro templates yearly (billing provider)");
    const change = client["subscriptions.save"]({
      id: `${M}-plan-1`,
      campaignId: "demo-c-8",
      name: "Sample · Pro templates monthly",
      billingPeriod: "yearly",
    });
    expect(await codeOf(change)).toBe("VALIDATION_FAILED");
  });
});

describe("growth plus: partnerships", () => {
  it("shows the merchant three agreements plus a partner's change, and Mara her proposal", async () => {
    const { client, runtime } = merchant();
    const { items } = await client["partnerships.list"]({});
    expect(items.map((p) => [p.id, p.fromMerchantId, p.toMerchantId, p.status])).toEqual([
      ["demo-pship-1", M, "demo-u-2", "accepted"],
      ["demo-pship-2", M, "demo-u-1", "proposed"],
      ["demo-pship-3", M, "demo-u-12", "terminated"],
      ["demo-pship-4", "demo-u-2", M, "proposed"],
    ]);
    const [active, , ended, change] = items;
    expect(active?.versionHistory.map((version) => version.version)).toEqual([1, 2]);
    expect(active?.performance.finalized).toBeGreaterThan(0);
    expect(ended?.performance.finalized).toBeGreaterThan(0);
    expect(change?.versionHistory.at(-1)?.version).toBe(3);
    runtime.setPersona("distributor");
    const mara = await client["partnerships.list"]({});
    expect(mara.items.map((p) => p.id)).toEqual(["demo-pship-2"]);
    runtime.setPersona("buyer");
    expect(await codeOf(client["partnerships.list"]({}))).toBe("NOT_AUTHORIZED");
  });

  it("lets Mara accept, folds an accepted change into its agreement and gives notice", async () => {
    const { client, runtime } = createDemoTestClient({ persona: "distributor" });
    expect(
      (await client["partnerships.respond"]({ id: "demo-pship-2", response: "accept" })).status,
    ).toBe("accepted");
    expect(
      await codeOf(client["partnerships.respond"]({ id: "demo-pship-4", response: "accept" })),
    ).toBe("NOT_FOUND");
    runtime.setPersona("merchant");
    const folded = await client["partnerships.respond"]({ id: "demo-pship-4", response: "accept" });
    expect(folded).toMatchObject({ id: "demo-pship-1", status: "accepted" });
    expect(folded.versionHistory.map((version) => version.version)).toEqual([1, 2, 3]);
    const { items } = await client["partnerships.list"]({});
    expect(items.map((p) => p.id)).toEqual(["demo-pship-1", "demo-pship-2", "demo-pship-3"]);
    expect(
      (await client["partnerships.terminate"]({ id: "demo-pship-1", mode: "notice" })).status,
    ).toBe("notice");
    const proposal = await client["partnerships.propose"]({
      toMerchantId: "demo-u-5",
      campaignIds: ["demo-c-1"],
      terms: "25% · 4 levels · 50/25/15/10 · 3 months, ends at term · 14 days' notice",
    });
    expect(proposal).toMatchObject({ status: "proposed", fromMerchantId: M });
    expect(
      (await client["partnerships.terminate"]({ id: proposal.id, mode: "withdraw" })).status,
    ).toBe("withdrawn");
  });
});

describe("growth plus: communities", () => {
  const mara = () => createDemoTestClient({ persona: "distributor" });

  it("seeds Mara's community with six members across two campaigns and one she belongs to", async () => {
    const { client } = mara();
    const { items } = await client["communities.list"]({});
    expect(items.map((c) => [c.id, c.campaignIds.length, c.memberCount])).toEqual([
      ["demo-community-studio", 2, 7],
      ["demo-community-devtools", 1, 4],
    ]);
    const members = await client["communities.members"]({ id: "demo-community-studio" });
    expect(members.items.filter((member) => member.role === "member")).toHaveLength(6);
    expect(await codeOf(client["communities.members"]({ id: "demo-community-fieldnotes" }))).toBe(
      "NOT_FOUND",
    );
  });

  it("joins with the sample invite code, refuses repeats and bad codes, and leaves", async () => {
    const { client, runtime } = mara();
    expect(inviteCodeOf(runtime.world, "demo-community-fieldnotes")).toBe("DEMO-FIELDNOTES");
    expect(
      await codeOf(
        client["communities.join"]({ id: "demo-community-fieldnotes", inviteCode: "NOPE" }),
      ),
    ).toBe("VALIDATION_FAILED");
    const joined = await client["communities.join"]({
      id: "demo-community-fieldnotes",
      inviteCode: "demo-fieldnotes",
    });
    expect(joined.role).toBe("member");
    expect(
      await codeOf(
        client["communities.join"]({
          id: "demo-community-fieldnotes",
          inviteCode: "DEMO-FIELDNOTES",
        }),
      ),
    ).toBe("CONFLICT");
    expect((await client["communities.list"]({})).items).toHaveLength(3);
    expect(await client["communities.leave"]({ id: "demo-community-devtools" })).toEqual({
      ok: true,
    });
    expect(await codeOf(client["communities.leave"]({ id: "demo-community-studio" }))).toBe(
      "VALIDATION_FAILED",
    );
    expect(
      await codeOf(
        client["communities.update"]({ id: "demo-community-fieldnotes", name: "Mine now" }),
      ),
    ).toBe("NOT_AUTHORIZED");
  });

  it("lets the owner edit, remove a member and regenerate the invite code", async () => {
    const { client, runtime } = mara();
    const removed = sampleAddress("person:2");
    const updated = await client["communities.update"]({
      id: "demo-community-studio",
      description: "Updated in the test.",
      removeMember: removed,
      regenerateInvite: true,
    });
    expect(updated).toMatchObject({ description: "Updated in the test.", memberCount: 6 });
    expect(inviteCodeOf(runtime.world, "demo-community-studio")).toBe("DEMO-STUDIO-2");
    const created = await client["communities.create"]({
      name: "Sample · Course sharers",
      description: "",
      campaignIds: ["demo-c-1"],
    });
    expect(created).toMatchObject({ memberCount: 1, campaignIds: ["demo-c-1"] });
    const unlinked = client["communities.create"]({
      name: "No link",
      description: "",
      campaignIds: ["demo-c-5"],
    });
    expect(await codeOf(unlinked)).toBe("VALIDATION_FAILED");
  });
});

describe("growth plus: journal replay", () => {
  it("rebuilds the same state from the journal after a reload", async () => {
    const { client, runtime, advance } = merchant();
    await client["apiKeys.create"]({
      confirmationToken: "demo-step-up-confirmation-token-0123456789",
      name: "Replay key",
      scopes: ["reports:read"],
    });
    advance(MINUTE);
    await client["webhooks.test"]({ id: `${M}-hook-1` });
    await client["team.invite"]({ address: sampleAddress("test:replay"), role: "viewer" });
    await client["integrations.connect"]({ provider: "stripe" });
    runtime.setPersona("distributor");
    await client["communities.join"]({
      id: "demo-community-fieldnotes",
      inviteCode: "DEMO-FIELDNOTES",
    });
    runtime.setPersona("merchant");
    const reads = async (target: typeof client) =>
      JSON.stringify([
        await target["apiKeys.list"]({}),
        await target["webhooks.deliveries"]({ id: `${M}-hook-1`, limit: 5 }),
        await target["team.members"]({}),
        await target["team.audit"]({ limit: 10 }),
        await target["integrations.list"]({}),
      ]);
    const restored = createDemoTestClient({ snapshot: runtime.snapshot(), persona: "merchant" });
    expect(restored.runtime.restore()).toBe("restored");
    expect(await reads(restored.client)).toBe(await reads(client));
    expect(restored.runtime.world.communityMembers["demo-community-fieldnotes"]).toHaveLength(4);
  });
});
