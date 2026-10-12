import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sql } from "drizzle-orm";
import { createChainService } from "../src/services/chain.js";
import { dripAmount, gasStatus, requestGas } from "../src/services/gas.js";
import { isolatedStore } from "./isolated-store.js";
import type { Services } from "../src/types.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const rpcUrl = process.env.TEST_GAS_RPC_URL;
const stationKey: Hex = `0x${"01".padStart(64, "0")}`;
const station = privateKeyToAccount(stationKey);
const wallets = [2, 3, 4, 5].map((value) =>
  privateKeyToAccount(`0x${value.toString(16).padStart(64, "0")}`),
);

describe.skipIf(!databaseUrl || !rpcUrl)("durable native gas funding on a real chain", () => {
  const chain = createChainService(rpcUrl ?? "http://127.0.0.1:20545", 10143, null, null);
  const testClient = createTestClient({
    mode: "anvil",
    transport: http(rpcUrl ?? "http://127.0.0.1:20545"),
  });
  let database: Awaited<ReturnType<typeof isolatedStore>>;
  let services: Services;
  let snapshot: Hex;
  const wallet = (index: number) => {
    const found = wallets[index];
    if (!found) throw new Error("Missing test wallet");
    return found;
  };
  const fund = (index: number, device = "device", ip = "network") =>
    requestGas(services, `account_${String(index)}`, wallet(index).address, device, ip);

  beforeAll(async () => {
    database = await isolatedStore(
      databaseUrl ?? "postgres://localhost:54332/spoke_test",
      `gas_${String(Date.now())}`,
    );
    services = {
      store: database.store,
      chain,
      webOrigin: "http://localhost:3140",
      production: false,
      operators: [],
      gasStationKey: stationKey,
    };
    expect(await chain.client.getChainId()).toBe(10143);
    snapshot = await testClient.snapshot();
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    await testClient.revert({ id: snapshot });
    snapshot = await testClient.snapshot();
    await testClient.setBalance({ address: station.address, value: 1000n * 10n ** 18n });
    await database.store.db.execute(sql`TRUNCATE api_records`);
    for (const [index, item] of wallets.entries()) {
      await testClient.setBalance({ address: item.address, value: 0n });
      await database.store.put("account", `account_${String(index)}`, `account_${String(index)}`, {
        accountKind: "passkey",
      });
    }
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await database.close();
  });

  it("funds once, records the real receipt and rejects a second daily transfer", async () => {
    const sent = await fund(0);
    expect(sent.amount).toBe(dripAmount.toString());
    expect(
      (await chain.client.waitForTransactionReceipt({ hash: sent.txHash as Hex })).status,
    ).toBe("success");
    expect(await chain.client.getBalance({ address: wallet(0).address })).toBe(dripAmount);
    expect((await gasStatus(services, "account_0", wallet(0).address)).gas).toMatchObject({
      state: "already_received",
      lastDripTxHash: sent.txHash,
    });
    await expect(fund(0)).rejects.toMatchObject({ code: "GAS_ALREADY_RECEIVED" });
    expect(
      (await database.store.get("gas-budget", new Date().toISOString().slice(0, 10)))?.payload
        .count,
    ).toBe(1);
  });

  it("reuses the durable signed transaction after an ambiguous provider failure", async () => {
    const send = vi.spyOn(chain.client, "sendRawTransaction");
    send.mockRejectedValueOnce(new Error("Provider connection closed"));
    await expect(fund(0)).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    const pending = await database.store.require("gas-account", "account_0");
    expect(pending.payload.state).toBe("sending");
    const retried = await fund(0);
    expect(retried.txHash).toBe(pending.payload.txHash);
    expect(send.mock.calls[0]?.[0].serializedTransaction).toBe(
      send.mock.calls[1]?.[0].serializedTransaction,
    );
    expect(
      (await chain.client.waitForTransactionReceipt({ hash: retried.txHash as Hex })).status,
    ).toBe("success");
    expect(await chain.client.getBalance({ address: wallet(0).address })).toBe(dripAmount);
    expect(
      (await database.store.get("gas-budget", new Date().toISOString().slice(0, 10)))?.payload
        .count,
    ).toBe(1);
  });

  it("keeps a confirmed transfer single even if the broadcast response is lost", async () => {
    const original = chain.client.sendRawTransaction;
    vi.spyOn(chain.client, "sendRawTransaction").mockImplementationOnce(async (input) => {
      await original(input);
      throw new Error("Response lost after broadcast");
    });
    await expect(fund(0)).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    await expect(fund(0)).rejects.toMatchObject({ code: "GAS_ALREADY_RECEIVED" });
    expect(await chain.client.getBalance({ address: wallet(0).address })).toBe(dripAmount);
  });

  it("recovers another account's unaccepted transfer before reserving the next nonce", async () => {
    vi.spyOn(chain.client, "sendRawTransaction").mockRejectedValueOnce(
      new Error("Provider unavailable before broadcast"),
    );
    await expect(fund(0)).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    const first = await database.store.require("gas-account", "account_0");
    const second = await fund(1);
    await chain.client.waitForTransactionReceipt({ hash: second.txHash as Hex });
    const resolved = await database.store.require("gas-account", "account_0");
    const next = await database.store.require("gas-account", "account_1");
    expect(resolved.payload.txHash).toBe(first.payload.txHash);
    expect(resolved.payload.state).toBe("received");
    expect(next.payload.nonce).toBe(Number(first.payload.nonce) + 1);
    expect(second.txHash).not.toBe(first.payload.txHash);
    for (const index of [0, 1])
      expect(await chain.client.getBalance({ address: wallet(index).address })).toBe(dripAmount);
    expect(
      (await database.store.get("gas-budget", new Date().toISOString().slice(0, 10)))?.payload
        .count,
    ).toBe(2);
  });

  it("limits device and network abuse while retaining separate account receipts", async () => {
    for (const index of [0, 1, 2]) {
      const sent = await fund(index);
      await chain.client.waitForTransactionReceipt({ hash: sent.txHash as Hex });
    }
    await expect(fund(3)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(await chain.client.getBalance({ address: wallet(3).address })).toBe(0n);
    expect(
      (await database.store.get("gas-budget", new Date().toISOString().slice(0, 10)))?.payload
        .count,
    ).toBe(3);
  });
});
