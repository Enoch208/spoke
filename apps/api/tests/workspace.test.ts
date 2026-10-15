import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { createChainService } from "../src/services/chain.js";
import { digest } from "../src/db/store.js";
import { sessions } from "../src/db/schema.js";
import { isolatedStore } from "./isolated-store.js";
import { clientMethodSchemas } from "@spoke/protocol";

const address = `0x${"a".repeat(40)}`;
const other = `0x${"b".repeat(40)}`;
const credentialId = "original-private-workspace-passkey";
const origin = "http://localhost:3040";
const path = "/v1/me/workspace/10143/1";
const url = process.env.TEST_DATABASE_URL;
const envelope = () => ({
  address,
  chainId: 10143,
  campaignId: "1",
  version: 1 as const,
  namespace: "spoke.campaign-notes.v1" as const,
  credentialId,
  revision: randomUUID(),
  savedAt: new Date().toISOString(),
  nonce: "AAAAAAAAAAAAAAAA",
  ciphertext: "AAAAAAAAAAAAAAAAAAAAAA",
});

describe.skipIf(!url)("encrypted workspace boundary and concurrency", () => {
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  let app: ReturnType<typeof createApp>;
  beforeAll(async () => {
    database = await isolatedStore(url ?? "", `workspace_${randomUUID().replaceAll("-", "")}`);
    const services = {
      store: database.store,
      chain: createChainService("http://127.0.0.1:1", 10143, null, address),
      webOrigin: origin,
      production: false,
      operators: [],
    };
    app = createApp({
      webOrigin: origin,
      probes: {
        rpc: () => Promise.resolve("down" as const),
        database: () => database.store.health(),
      },
      config: { chainId: 10143, protocolAddress: null },
      services,
    });
  });
  afterAll(() => database.close());
  beforeEach(async () => {
    await database.store.db.execute(
      sql`truncate api_records,api_identities,api_sessions,api_rate_buckets`,
    );
    await database.store.put("campaign", "1", "merchant", { chainId: 10143 });
    for (const wallet of [address, other]) {
      await database.store.reserve("wallet", wallet, wallet);
      await database.store.put("account", wallet, wallet, { accountKind: "passkey" });
      await database.store.db
        .insert(sessions)
        .values({
          hash: digest(wallet),
          id: randomUUID(),
          accountId: wallet,
          address: wallet,
          csrfHash: digest("csrf"),
          method: "passkey",
          deviceLabel: "test",
          expiresAt: new Date(Date.now() + 60000),
        });
    }
    await database.store.put("passkey", digest(credentialId), address, {
      credentialId,
      kind: "original",
    });
  });
  const request = (method: string, body?: unknown, wallet = address, route = path, csrf = "csrf") =>
    app.request(route, {
      method,
      headers: {
        cookie: `spoke_session=${wallet}`,
        origin,
        "x-csrf-token": csrf,
        "content-type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  it("persists only ciphertext and restores it in a later authenticated session", async () => {
    const note = envelope();
    const saved = await request("PUT", { note, expectedRevision: null });
    expect(saved.status).toBe(200);
    const raw = (await saved.json()) as { data: unknown };
    expect(clientMethodSchemas["workspace.save"].output.parse(raw.data).note).toEqual(note);
    await database.store.db
      .update(sessions)
      .set({ hash: digest("new-session") })
      .where(sql`address=${address}`);
    const restored = await app.request(path, { headers: { cookie: "spoke_session=new-session" } });
    expect(await restored.json()).toMatchObject({ data: { note } });
    const records = await database.store.list("encrypted-workspace", address);
    expect(Object.keys(records.items[0]?.payload ?? {}).sort()).toEqual(Object.keys(note).sort());
  });
  it("rejects plaintext, foreign scope, wrong credential, missing CSRF and anonymous access", async () => {
    const note = envelope();
    expect((await app.request(path)).status).toBe(401);
    for (const changed of [
      { ...note, text: "private plaintext" },
      { ...note, address: other },
      { ...note, chainId: 143 },
      { ...note, campaignId: "2" },
      { ...note, credentialId: "unregistered-credential" },
      { ...note, ciphertext: "a".repeat(33001) },
    ]) {
      expect(
        (await request("PUT", { note: changed, expectedRevision: null })).status,
      ).toBeGreaterThanOrEqual(400);
    }
    expect(
      (await request("PUT", { note, expectedRevision: null }, address, path, "wrong")).status,
    ).toBe(403);
    expect((await database.store.list("encrypted-workspace")).items).toHaveLength(0);
  });
  it("never leaks another account's notebook or reveals plaintext in the index", async () => {
    const note = envelope();
    await request("PUT", { note, expectedRevision: null });
    expect(await (await request("GET", undefined, other)).json()).toMatchObject({
      data: { note: null },
    });
    const index = (await (await request("GET", undefined, address, "/v1/me/workspace")).json()) as {
      data: unknown;
    };
    const parsed = clientMethodSchemas["workspace.list"].output.parse(index.data);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).not.toHaveProperty("ciphertext");
    expect(parsed.items[0]).not.toHaveProperty("credentialId");
    expect((await request("PUT", { note, expectedRevision: null }, other)).status).toBe(400);
  });
  it("requires passkey sign-in, a registered credential and a known campaign", async () => {
    await database.store.db
      .update(sessions)
      .set({ method: "wallet" })
      .where(sql`address=${address}`);
    expect((await request("GET")).status).toBe(403);
    expect((await request("PUT", { note: envelope(), expectedRevision: null })).status).toBe(403);
    await database.store.db
      .update(sessions)
      .set({ method: "passkey" })
      .where(sql`address=${address}`);
    const note = { ...envelope(), campaignId: "99" };
    expect(
      (await request("PUT", { note, expectedRevision: null }, address, "/v1/me/workspace/10143/99"))
        .status,
    ).toBe(404);
  });
  it("accepts exact retries, rejects changed revisions and detects competing device saves", async () => {
    const first = envelope();
    expect((await request("PUT", { note: first, expectedRevision: null })).status).toBe(200);
    expect((await request("PUT", { note: first, expectedRevision: null })).status).toBe(200);
    expect(
      (
        await request("PUT", {
          note: { ...first, ciphertext: "BBBBBBBBBBBBBBBBBBBBBB" },
          expectedRevision: first.revision,
        })
      ).status,
    ).toBe(409);
    const second = envelope();
    const third = envelope();
    const responses = await Promise.all([
      request("PUT", { note: second, expectedRevision: first.revision }),
      request("PUT", { note: third, expectedRevision: first.revision }),
    ]);
    expect(responses.map((row) => row.status).sort()).toEqual([200, 409]);
    expect(
      (await request("PUT", { note: envelope(), expectedRevision: first.revision })).status,
    ).toBe(409);
  });
});
