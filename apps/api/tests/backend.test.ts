import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { connectStore } from "../src/db/store.js";
import { createChainService } from "../src/services/chain.js";
import { events } from "../src/db/schema.js";
import { clientMethodSchemas, accountKind } from "@spoke/protocol";

const databaseUrl = process.env.TEST_DATABASE_URL;
const wallet = privateKeyToAccount(`0x${"01".padStart(64, "0")}`);
const other = privateKeyToAccount(`0x${"02".padStart(64, "0")}`);
const token = "0x0000000000000000000000000000000000000001";
const origin = "http://localhost:3040";
const challengeSchema = z.object({ data: z.object({ message: z.string(), nonce: z.string() }) });
const sessionSchema = z.object({ data: z.object({ csrfToken: z.string(), address: z.string() }) });

describe.skipIf(!databaseUrl)("persistent API security and lifecycle", () => {
  const store = connectStore(databaseUrl ?? "postgres://localhost:54332/spoke_test");
  const services = {
    store,
    chain: createChainService("http://127.0.0.1:1", 31337, null, token),
    webOrigin: origin,
    production: false,
    operators: [],
  };
  const app = createApp({
    webOrigin: origin,
    probes: { rpc: () => Promise.resolve("down" as const), database: () => store.health() },
    config: { chainId: 31337, protocolAddress: null },
    services,
  });
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    await app.request(`/v1${path}`, {
      method,
      headers: { origin, "content-type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const signIn = async (signer = wallet, kind: z.infer<typeof accountKind> = "wallet") => {
    const challenge = challengeSchema.parse(
      await (
        await request("/auth/challenge", "POST", {
          address: signer.address,
          chainId: 31337,
          accountKind: kind,
        })
      ).json(),
    ).data;
    const signature = await signer.signMessage({ message: challenge.message });
    const response = await request("/auth/verify", "POST", {
      message: challenge.message,
      signature,
      method: kind,
    });
    expect(response.status).toBe(200);
    const session = sessionSchema.parse(await response.json()).data;
    return {
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
      "x-csrf-token": session.csrfToken,
    };
  };
  const confirm = async (headers: Record<string, string>, action: string) => {
    const challenge = challengeSchema.parse(
      await (
        await request(
          "/auth/challenge",
          "POST",
          {
            address: wallet.address,
            chainId: 31337,
            purpose: "confirm",
            action,
          },
          headers,
        )
      ).json(),
    ).data;
    const response = await request(
      "/auth/verify",
      "POST",
      {
        message: challenge.message,
        signature: await wallet.signMessage({ message: challenge.message }),
      },
      headers,
    );
    expect(response.status).toBe(200);
    return z
      .object({ data: z.object({ confirmationToken: z.string() }) })
      .parse(await response.json()).data.confirmationToken;
  };
  const merchant = async (headers: Record<string, string>, slug = "merchant_one") => {
    const response = await request(
      "/merchant",
      "POST",
      {
        name: "Test Merchant",
        slug,
        supportEmail: "test@example.com",
        region: "NG",
        agreementVersion: "1.0",
      },
      headers,
    );
    expect(response.status).toBe(201);
  };
  const product = {
    title: "Test product",
    summary: "A product for integration testing",
    description: "Detailed description",
    category: "digital",
    priceBaseUnits: "100000000",
    token,
    fulfillmentMode: "manual",
    deliverable: "asset:private-test-resource",
    refundPolicy: "Refundable before settlement",
  };
  beforeAll(async () => {
    await store.migrate();
  });
  beforeEach(async () => {
    await store.db.execute(
      sql`TRUNCATE api_records,api_identities,api_challenges,api_sessions,api_confirmations,api_idempotency,api_rate_buckets,api_chain_events`,
    );
  });
  afterAll(async () => {
    await store.close();
  });

  it("signs in with a real wallet signature and sets a private session cookie", async () => {
    const headers = await signIn();
    const response = await request("/me", "GET", undefined, headers);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      schemaVersion: "3.0",
      data: { address: wallet.address, isOperator: false },
    });
  });
  it("lists only this account's sessions with canonical timestamps and current-device identity", async () => {
    const first = await signIn(wallet, "passkey");
    const current = await signIn(wallet, "passkey");
    await signIn(other);
    const response = await request("/me/sessions", "GET", undefined, current);
    expect(response.status).toBe(200);
    const { data } = z
      .object({ data: clientMethodSchemas["account.sessions"].output })
      .parse(await response.json());
    expect(data).toHaveLength(2);
    expect(data.filter((session) => session.isCurrent)).toHaveLength(1);
    expect(data.every((session) => session.method === "passkey")).toBe(true);
    const firstResponse = await request("/me/sessions", "GET", undefined, first);
    const previous = z
      .object({ data: clientMethodSchemas["account.sessions"].output })
      .parse(await firstResponse.json());
    expect(previous.data.find((session) => session.isCurrent)?.id).not.toBe(
      data.find((session) => session.isCurrent)?.id,
    );
    for (const session of data) {
      expect(Date.parse(session.expiresAt)).toBeGreaterThan(Date.parse(session.signedInAt));
      expect(Date.parse(session.lastActiveAt)).toBeGreaterThanOrEqual(
        Date.parse(session.signedInAt),
      );
    }
  });
  it("rejects unauthenticated account and merchant reads", async () => {
    expect((await request("/me")).status).toBe(401);
    expect((await request("/merchant/products")).status).toBe(401);
  });
  it("restricts wallet research to merchants and respects current profile visibility", async () => {
    const path = `/merchant/distributors/${other.address}/insights`;
    expect((await request(path)).status).toBe(401);
    const headers = await signIn();
    expect((await request(path, "GET", undefined, headers)).status).toBe(403);
    await merchant(headers);
    await signIn(other);
    const owner = await store.identity("wallet", other.address.toLowerCase());
    expect(owner).toBeTruthy();
    const account = await store.require("account", owner ?? "");
    for (const level of ["private", "pseudonymous", "public", "private"] as const) {
      await store.put("account", account.id, account.owner, {
        ...account.payload,
        visibility: { level, fields: [], acceptsInvitations: false },
      });
      const research = await request(path, "POST", {}, headers);
      expect(research.status).toBe(level === "public" ? 200 : 404);
      const response = await request(path, "GET", undefined, headers);
      expect(response.status).toBe(level === "public" ? 200 : 404);
      if (level === "public")
        expect(await response.json()).toMatchObject({ data: { status: "none" } });
    }
    expect(
      (
        await request(
          `/merchant/distributors/${wallet.address}/insights`,
          "GET",
          undefined,
          headers,
        )
      ).status,
    ).toBe(200);
  });
  it("returns the canonical account, merchant and product schemas without exposing deliverables", async () => {
    const headers = await signIn();
    await merchant(headers);
    const me = z
      .object({ data: clientMethodSchemas["account.me"].output })
      .parse(await (await request("/me", "GET", undefined, headers)).json());
    expect(me.data.workspaces).toHaveLength(1);
    expect(me.data.handleChangedAt).toBeNull();
    z.object({ data: clientMethodSchemas["merchants.me"].output }).parse(
      await (await request("/merchant", "GET", undefined, headers)).json(),
    );
    const response = await request(
      "/merchant/products/canonical",
      "PUT",
      { ...product, outcome: "Download the guide" },
      headers,
    );
    const saved = z
      .object({ data: clientMethodSchemas["products.save"].output })
      .parse(await response.json());
    expect(saved.data.outcome).toBe("Download the guide");
    expect(saved.data.deliverable).toBe(product.deliverable);
    const publicProduct = await request("/products/canonical", "GET");
    expect(publicProduct.status).toBe(200);
    expect(JSON.stringify(await publicProduct.json())).not.toContain(product.deliverable);
  });
  it("reports an unknown recovery address before creating any account or session", async () => {
    const challenge = challengeSchema.parse(
      await (
        await request("/auth/challenge", "POST", {
          address: wallet.address,
          chainId: 31337,
          accountKind: "phrase",
        })
      ).json(),
    ).data;
    const response = await request("/auth/verify", "POST", {
      message: challenge.message,
      signature: await wallet.signMessage({ message: challenge.message }),
      method: "phrase",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { address: wallet.address, isNewAccount: true, session: null },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await store.get("account", wallet.address.toLowerCase())).toBeUndefined();
    expect(await store.identity("wallet", wallet.address.toLowerCase())).toBeUndefined();
  });
  it("serializes concurrent product updates into immutable versions", async () => {
    const headers = await signIn();
    await merchant(headers);
    await request("/merchant/products/concurrent", "PUT", product, headers);
    const responses = await Promise.all(
      ["Second", "Third", "Fourth"].map((title) =>
        request("/merchant/products/concurrent", "PUT", { ...product, title }, headers),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect((await store.require("product", "concurrent")).payload.version).toBe(4);
    const versions = await Promise.all(
      [1, 2, 3, 4].map((version) =>
        store.require("product-version", `concurrent_${String(version)}`),
      ),
    );
    expect(new Set(versions.map((row) => row.payload.title)).size).toBe(4);
  });
  it("rejects stale draft saves rather than losing another tab's changes", async () => {
    const headers = await signIn();
    await merchant(headers);
    await request("/merchant/products/draft_product", "PUT", product, headers);
    const draft = {
      productId: "draft_product",
      mode: "create",
      version: 0,
      stepReached: 2,
      endsAt: "2027-01-01T00:00:00Z",
      policy: {
        rewardToken: token,
        commissionBps: 1000,
        perSaleCap: "10000000",
        campaignLiabilityCap: "1000000000",
        maxRewardedAncestors: 1,
        weightsBps: [10000],
        holdSeconds: 600,
        expiry: "1798761600",
        eligibilityHash: `0x${"00".repeat(32)}`,
      },
    };
    const first = await request("/merchant/campaign-drafts/draft_one", "PUT", draft, headers);
    expect(first.status).toBe(200);
    const saved = z
      .object({ data: clientMethodSchemas["campaigns.getDraft"].output })
      .parse(await first.json());
    expect(saved.data.version).toBe(1);
    const responses = await Promise.all(
      [3, 4].map((stepReached) =>
        request(
          "/merchant/campaign-drafts/draft_one",
          "PUT",
          { ...draft, version: 1, stepReached },
          headers,
        ),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await store.require("draft", "draft_one")).payload.version).toBe(2);
  });
  it("keeps added passkey vaults opaque and requires action-bound confirmation", async () => {
    const headers = await signIn(wallet, "passkey");
    const original = {
      credentialId: "credential_original_1",
      kind: "original",
      transports: ["internal"],
      label: "First device",
    };
    const originalResponse = await request("/me/passkeys", "POST", original, headers);
    expect(originalResponse.status).toBe(201);
    const added = {
      credentialId: "credential_added_1",
      kind: "added",
      transports: ["internal"],
      label: "Second device",
      vault: { ciphertext: "encrypted-test-fixture", iv: "test-iv" },
    };
    expect((await request("/me/passkeys", "POST", added, headers)).status).toBe(403);
    const confirmationToken = await confirm(headers, "account.addPasskey");
    const response = await request(
      "/me/passkeys",
      "POST",
      { ...added, confirmationToken },
      headers,
    );
    expect(response.status).toBe(201);
    expect(JSON.stringify(await response.json())).not.toContain("encrypted-test-fixture");
    expect(await (await request(`/passkey-vaults/${added.credentialId}`)).json()).toMatchObject({
      data: added.vault,
    });
    expect(
      (
        await request(
          `/me/passkeys/${original.credentialId}`,
          "DELETE",
          { confirmationToken },
          headers,
        )
      ).status,
    ).toBe(409);
    const stranger = await signIn(other);
    expect(
      (await request(`/me/passkeys/${added.credentialId}`, "PATCH", { label: "Stolen" }, stranger))
        .status,
    ).toBe(404);
  });
  it("rejects signatures from another wallet", async () => {
    const { message } = challengeSchema.parse(
      await (
        await request("/auth/challenge", "POST", { address: wallet.address, chainId: 31337 })
      ).json(),
    ).data;
    expect(
      (
        await request("/auth/verify", "POST", {
          message,
          signature: await other.signMessage({ message }),
        })
      ).status,
    ).toBe(401);
  });
  it("consumes a challenge exactly once even under simultaneous verification", async () => {
    const { message } = challengeSchema.parse(
      await (
        await request("/auth/challenge", "POST", { address: wallet.address, chainId: 31337 })
      ).json(),
    ).data;
    const body = { message, signature: await wallet.signMessage({ message }) };
    const responses = await Promise.all([
      request("/auth/verify", "POST", body),
      request("/auth/verify", "POST", body),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
  });
  it("rejects cross-origin sign-in and wrong-chain challenges", async () => {
    expect(
      (
        await request(
          "/auth/challenge",
          "POST",
          { address: wallet.address, chainId: 31337 },
          { origin: "https://attacker.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (await request("/auth/challenge", "POST", { address: wallet.address, chainId: 1 })).status,
    ).toBe(400);
  });
  it("requires CSRF protection for session writes", async () => {
    const headers = await signIn();
    expect(
      (await request("/me", "PATCH", { displayName: "Attacker" }, { cookie: headers.cookie }))
        .status,
    ).toBe(403);
    expect((await request("/me", "PATCH", { displayName: "Alice" }, headers)).status).toBe(200);
  });
  it("checks reserved handles and enforces the handle-change interval", async () => {
    const headers = await signIn();
    expect((await request("/me", "PATCH", { handle: "admin" }, headers)).status).toBe(409);
    expect((await request("/me", "PATCH", { handle: "alice_user" }, headers)).status).toBe(200);
    expect((await request("/me", "PATCH", { handle: "new_handle" }, headers)).status).toBe(409);
  });
  it("reserves handles uniquely across accounts", async () => {
    const alice = await signIn();
    const bob = await signIn(other);
    expect((await request("/me", "PATCH", { handle: "same_handle" }, alice)).status).toBe(200);
    expect((await request("/me", "PATCH", { handle: "same_handle" }, bob)).status).toBe(409);
  });
  it("keeps deliverables private and creates immutable product versions", async () => {
    const headers = await signIn();
    await merchant(headers);
    expect((await request("/merchant/products/p1", "PUT", product, headers)).status).toBe(201);
    const publicProduct: unknown = await (await request("/products/p1")).json();
    expect(JSON.stringify(publicProduct)).not.toContain(product.deliverable);
    expect(
      (
        await request(
          "/merchant/products/p1",
          "PUT",
          { ...product, priceBaseUnits: "200000000" },
          headers,
        )
      ).status,
    ).toBe(200);
    expect((await store.require("product-version", "p1_1")).payload.priceBaseUnits).toBe(
      "100000000",
    );
    expect((await store.require("product-version", "p1_2")).payload.priceBaseUnits).toBe(
      "200000000",
    );
  });
  it("prevents one merchant from changing another merchant's product", async () => {
    const alice = await signIn();
    const bob = await signIn(other);
    await merchant(alice);
    await merchant(bob, "merchant_two");
    await request("/merchant/products/p1", "PUT", product, alice);
    expect(
      (await request("/merchant/products/p1", "PUT", { ...product, title: "Stolen" }, bob)).status,
    ).toBe(404);
  });
  it("rejects unexpected body fields and JSON numbers for money", async () => {
    const headers = await signIn();
    await merchant(headers);
    expect(
      (await request("/merchant/products/p1", "PUT", { ...product, priceBaseUnits: 100 }, headers))
        .status,
    ).toBe(400);
    expect((await request("/me", "PATCH", { isOperator: true }, headers)).status).toBe(400);
  });
  it("creates idempotent intents atomically and detects changed payloads", async () => {
    const payload = { campaignId: "1", expectedPrice: "100", orderKey: "key" };
    const [first, second] = await Promise.all([
      store.createIntent("alice", "unique-key", payload),
      store.createIntent("alice", "unique-key", payload),
    ]);
    expect(first.id).toBe(second.id);
    await expect(
      store.createIntent("alice", "unique-key", { ...payload, expectedPrice: "101" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await store.createIntent("bob", "unique-key", payload)).id).not.toBe(first.id);
  });
  it("masks buyer identities in public receipts", async () => {
    const hash = `0x${"ab".repeat(32)}`;
    const protocol = "0x0000000000000000000000000000000000000002";
    await store.put("receipt", "1", wallet.address.toLowerCase(), {
      saleId: "1",
      buyer: wallet.address,
      status: 1,
      allocations: [],
      campaignId: "1",
      contractAddress: protocol,
      chainId: 31337,
      nodeId: "0",
      orderKey: hash,
      policyHash: hash,
      policyVersion: 1,
      price: "10000",
      rewardReserved: "0",
      purchasedAt: "1800000000",
      unlockAt: "1800000600",
      indexedBlock: "5",
    });
    await store.db.insert(events).values({
      id: "purchase-test",
      chainId: 31337,
      txHash: hash,
      logIndex: 0,
      blockHash: hash,
      blockNumber: "5",
      name: "NativePurchaseAccepted",
      payload: { saleId: "1", buyer: wallet.address },
      at: new Date(1800000000 * 1000),
    });
    const readApp = createApp({
      webOrigin: origin,
      probes: { rpc: () => Promise.resolve("ok" as const) },
      config: { chainId: 31337, protocolAddress: protocol },
      services: {
        ...services,
        chain: createChainService("http://127.0.0.1:1", 31337, protocol, token),
      },
    });
    const response = await readApp.request("/v1/receipts/31337/1");
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(JSON.stringify(body)).not.toContain(wallet.address);
    const receipt = z.object({ data: clientMethodSchemas["receipts.get"].output }).parse(body);
    expect(receipt.data.purchaseTx.hash).toBe(hash);
    expect(receipt.data.buyer).toBeNull();
  });
  it("hides private profiles and blocks misleading performance visibility", async () => {
    const headers = await signIn();
    expect(await (await request(`/distributors/${wallet.address}/profile`)).json()).toMatchObject({
      data: { hidden: true },
    });
    expect(
      (
        await request(
          "/me/reputation/visibility",
          "PATCH",
          { level: "public", fields: ["settledConversions"] },
          headers,
        )
      ).status,
    ).toBe(400);
  });
  it("requires action-bound step-up authorization", async () => {
    const headers = await signIn();
    expect(
      (
        await request(
          "/me/payout-address",
          "PUT",
          { address: wallet.address, confirmationToken: "0".repeat(64) },
          headers,
        )
      ).status,
    ).toBe(403);
  });
  it("marks notifications without destroying their contents or touching another account", async () => {
    const headers = await signIn();
    await store.put(
      "notification",
      "11111111-1111-4111-8111-111111111111",
      wallet.address.toLowerCase(),
      { title: "Reward vested", readAt: null },
    );
    await store.put(
      "notification",
      "22222222-2222-4222-8222-222222222222",
      other.address.toLowerCase(),
      { title: "Private", readAt: null },
    );
    expect((await request("/me/notifications/read", "POST", { all: true }, headers)).status).toBe(
      200,
    );
    const notification = (
      await store.require("notification", "11111111-1111-4111-8111-111111111111")
    ).payload;
    expect(notification.title).toBe("Reward vested");
    expect(typeof notification.readAt).toBe("string");
    expect(
      (await store.require("notification", "22222222-2222-4222-8222-222222222222")).payload.readAt,
    ).toBeNull();
  });
  it("exposes public reads to SDK clients without credentialed wildcard CORS", async () => {
    const response = await request("/campaigns", "GET", undefined, {
      origin: "https://sdk.example",
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("reports an undeployed contract without claiming a checkout succeeded", async () => {
    const headers = await signIn();
    const response = await request(
      "/checkout/intents",
      "POST",
      {
        campaignId: "1",
        orderKey: `0x${"0".repeat(64)}`,
        expectedPrice: "100",
        expectedReward: "10",
        policyHash: `0x${"0".repeat(64)}`,
        chainId: 31337,
      },
      { ...headers, "idempotency-key": "test-key-1" },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "PROTOCOL_NOT_DEPLOYED" } });
  });
  it("revokes sessions on sign-out", async () => {
    const headers = await signIn();
    expect((await request("/auth/sign-out", "POST", {}, headers)).status).toBe(200);
    expect((await request("/me", "GET", undefined, headers)).status).toBe(401);
  });
  it("rejects operator routes for ordinary accounts", async () => {
    const headers = await signIn();
    expect((await request("/ops/audit", "GET", undefined, headers)).status).toBe(403);
  });
  it("enforces persistent rate limits and returns retry guidance", async () => {
    for (let count = 0; count < 30; count++) await request("/handles/example");
    const response = await request("/handles/example");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    const error = z.object({
      error: z.object({
        code: z.literal("RATE_LIMITED"),
        details: z.object({ retryAfterSeconds: z.number().positive() }),
      }),
    });
    expect(error.safeParse(await response.json()).success).toBe(true);
  });
});
