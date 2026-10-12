import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { digest, newId } from "../src/db/store.js";
import { challenges, confirmations, sessions } from "../src/db/schema.js";
import { createChainService } from "../src/services/chain.js";
import { projectionKinds } from "../src/services/indexer.js";
import { storeAsset } from "../src/services/assets.js";
import type { Services } from "../src/types.js";
import { isolatedStore } from "./isolated-store.js";
import { buyer, merchant, contract, paymentToken, fixtureRpc } from "./indexing-fixture.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const origin = "http://localhost:3040";
const buyerToken = "buyer-session-test";
const merchantToken = "merchant-session-test";
const csrf = "test-csrf-token";
const stepToken = "confirmation-token-with-at-least-32-characters";
const hash = `0x${"01".repeat(32)}`;

describe.skipIf(!databaseUrl)("privacy deletion and wallet capability revocation", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>> | undefined;
  let rpc: Awaited<ReturnType<typeof fixtureRpc>> | undefined;
  let services: Services | undefined;
  let application: ReturnType<typeof createApp> | undefined;
  let directory = "";
  const context = () => {
    if (!database || !services || !application)
      throw new Error("Privacy test context unavailable.");
    return { store: database.store, services, app: application };
  };
  const session = async (address: string, token: string, owner = address) => {
    const { store } = context();
    await store.db.insert(sessions).values({
      hash: digest(token),
      id: newId(),
      accountId: owner,
      address,
      csrfHash: digest(csrf),
      method: "wallet",
      deviceLabel: "Privacy test",
      expiresAt: new Date(Date.now() + 3600000),
    });
  };
  const confirmation = async (action: string) => {
    await context()
      .store.db.insert(confirmations)
      .values({
        hash: digest(stepToken),
        sessionHash: digest(merchantToken),
        action,
        expiresAt: new Date(Date.now() + 300000),
      });
  };
  const request = (path: string, method = "GET", body?: unknown, token = merchantToken) =>
    context().app.request(`/v1${path}`, {
      method,
      headers: {
        origin,
        "content-type": "application/json",
        cookie: `spoke_session=${token}`,
        "x-csrf-token": csrf,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  beforeAll(async () => {
    database = await isolatedStore(
      databaseUrl ?? "postgres://localhost:54332/spoke_test",
      `privacy_${randomUUID().replaceAll("-", "")}`,
    );
    rpc = await fixtureRpc();
    directory = await mkdtemp(join(tmpdir(), "spoke-privacy-"));
    const base = createChainService(rpc.url, 31337, contract, paymentToken);
    services = {
      store: database.store,
      chain: {
        ...base,
        campaign: async (id, block) => {
          const fresh = await base.campaign(id, block);
          return { ...fresh, campaign: { ...fresh.campaign, ended: true } };
        },
      },
      webOrigin: origin,
      apiOrigin: origin,
      storageDirectory: directory,
      production: false,
      operators: [],
    };
    application = createApp({
      webOrigin: origin,
      probes: {
        rpc: () => Promise.resolve("ok" as const),
        database: () => context().store.health(),
      },
      config: { chainId: 31337, protocolAddress: contract },
      services,
    });
  });
  beforeEach(async () => {
    const { store } = context();
    await store.db.execute(
      sql`TRUNCATE api_records,api_identities,api_challenges,api_sessions,api_confirmations,api_idempotency,api_rate_buckets,api_chain_events`,
    );
    for (const address of [merchant, buyer]) {
      await store.put("account", address, address, {
        address,
        payoutAddress: address,
        visibility: { level: "private", fields: [], acceptsInvitations: false },
      });
      await store.put("wallet", address, address, { address });
      await store.reserve("wallet", address, address);
    }
    await store.put("merchant", merchant, merchant, {
      address: merchant,
      name: "Historical Merchant",
      slug: "historical_merchant",
      closedAt: null,
    });
    await store.reserve("slug", "historical_merchant", merchant);
    await store.reserve("handle", "old_private_handle", merchant);
    await session(merchant, merchantToken);
    await session(buyer, buyerToken);
  });
  afterAll(async () => {
    await database?.close();
    await rpc?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  });
  it("keeps historical paid downloads and projections after merchant account deletion", async () => {
    const { store, services } = context();
    const file = await storeAsset(
      services,
      merchant,
      new File(["The original paid download"], "guide.pdf", { type: "application/pdf" }),
      "paid-product",
    );
    const product = {
      merchantId: merchant,
      skuHash: hash,
      fulfillmentMode: "download",
      deliverable: file.id,
    };
    await store.put("product", "paid-product", merchant, product);
    await store.put("product-version", "paid-product_1", merchant, product);
    for (const kind of [
      ...projectionKinds,
      "campaign-metadata",
      "campaign-metadata-commitment",
      "link",
    ])
      await store.put(kind, `history-${kind}`, merchant, { retained: true });
    await store.put("preferences", merchant, merchant, { privatePreference: true });
    await store.put("passkey", "old-passkey", merchant, { vault: { ciphertext: "private" } });
    const access = await request("/fulfillment/1/access", "POST", {}, buyerToken);
    expect(access.status).toBe(200);
    const accessUrl = z
      .object({ data: z.object({ items: z.array(z.object({ url: z.string() })).min(1) }) })
      .parse(await access.json()).data.items[0]?.url;
    if (!accessUrl) throw new Error("Paid delivery grant unavailable.");
    const downloadPath = new URL(accessUrl).pathname + new URL(accessUrl).search;
    expect(await (await context().app.request(downloadPath)).text()).toBe(
      "The original paid download",
    );
    await confirmation("account.deleteAccount");
    expect(
      (
        await request("/me", "DELETE", {
          confirmationToken: stepToken,
          typedConfirmation: "delete my account",
        })
      ).status,
    ).toBe(200);
    expect(await store.get("account", merchant)).toBeUndefined();
    expect(await store.get("preferences", merchant)).toBeUndefined();
    expect(await store.get("passkey", "old-passkey")).toBeUndefined();
    expect(await store.identity("handle", "old_private_handle")).toBeUndefined();
    expect(await store.identity("slug", "historical_merchant")).toBe(merchant);
    expect((await store.require("merchant", merchant)).payload.closedAt).toEqual(
      expect.any(String),
    );
    for (const kind of [
      ...projectionKinds,
      "campaign-metadata",
      "campaign-metadata-commitment",
      "link",
    ])
      expect(await store.get(kind, `history-${kind}`)).toBeDefined();
    expect(await store.get("product-version", "paid-product_1")).toBeDefined();
    expect(await store.get("asset", file.id)).toBeDefined();
    const delivered = await context().app.request(downloadPath);
    expect(delivered.status).toBe(200);
    expect(await delivered.text()).toBe("The original paid download");
    expect((await request("/fulfillment/1/access", "POST", {}, buyerToken)).status).toBe(200);
    expect((await request("/me/preferences")).status).toBe(401);
    expect(rpc?.state.errors).toEqual([]);
  });
  it("revokes unlinked wallet sessions, confirmations, challenges and access grants atomically", async () => {
    const { store } = context();
    await store.db.execute(
      sql`DELETE FROM api_identities WHERE namespace='wallet' AND value=${buyer}`,
    );
    await store.reserve("wallet", buyer, merchant);
    await store.db.execute(
      sql`UPDATE api_records SET owner=${merchant} WHERE kind='wallet' AND id=${buyer}`,
    );
    await store.db.delete(sessions).where(eq(sessions.hash, digest(buyerToken)));
    await session(buyer, buyerToken, merchant);
    await confirmation("account.unlinkWallet");
    await store.db.insert(confirmations).values({
      hash: digest("secondary-confirmation"),
      sessionHash: digest(buyerToken),
      action: "account.exportData",
      expiresAt: new Date(Date.now() + 300000),
    });
    await store.db.insert(challenges).values({
      nonce: "secondary-challenge",
      address: buyer,
      message: "test",
      kind: "wallet",
      purpose: "confirm",
      action: "account.exportData",
      accountId: merchant,
      expiresAt: new Date(Date.now() + 300000),
    });
    await store.put("access-grant", "removed-grant", merchant, { buyer });
    await store.put("access-grant", "remaining-grant", merchant, { buyer: merchant });
    expect(
      (await request(`/me/wallets/${buyer}`, "DELETE", { confirmationToken: stepToken })).status,
    ).toBe(200);
    expect(await store.identity("wallet", buyer)).toBeUndefined();
    expect((await request("/me/preferences", "GET", undefined, buyerToken)).status).toBe(401);
    expect((await request("/me/preferences")).status).toBe(200);
    expect(
      await store.db.query.confirmations.findFirst({
        where: eq(confirmations.hash, digest("secondary-confirmation")),
      }),
    ).toBeUndefined();
    expect(
      await store.db.query.challenges.findFirst({
        where: eq(challenges.nonce, "secondary-challenge"),
      }),
    ).toBeUndefined();
    expect(await store.get("access-grant", "removed-grant")).toBeUndefined();
    expect(await store.get("access-grant", "remaining-grant")).toBeDefined();
  });
  it("prunes expired capabilities without deleting retained historical records", async () => {
    const { store } = context();
    for (const kind of ["access-grant", "export", "product-version", "asset", "receipt", "link"])
      await store.put(kind, "expiry-test", merchant, { expiresAt: "2000-01-01T00:00:00.000Z" });
    await store.pruneExpired();
    for (const kind of ["access-grant", "export"])
      expect(await store.get(kind, "expiry-test")).toBeUndefined();
    for (const kind of ["product-version", "asset", "receipt", "link"])
      expect(await store.get(kind, "expiry-test")).toBeDefined();
  });
});
