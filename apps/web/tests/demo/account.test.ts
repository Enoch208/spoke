import { clientMethodSchemas } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { sampleAddress } from "../../src/demo/world/ids";
import { MERCHANT_SAMPLE_WALLET, credentialIdOf } from "../../src/demo/world/seed-accounts-parts";
import { notify } from "../../src/lib/client/demo/domains/account-notify";
import { createDemoTestClient } from "./harness";

const token = "c".repeat(64);
const signature = `0x${"ab".repeat(65)}`;
const main = sampleAddress("merchant-a:main");
const business = sampleAddress("merchant-a:business");
const fresh = (n: number) => `0x${String(n).padStart(40, "0")}`;
const link = (address: string, kind: "wallet" | "passkey" = "wallet") => ({
  address,
  kind,
  linkSignature: signature,
  nonce: "a1b2c3d4",
  confirmationToken: token,
});

const allNotifications = async (persona: "merchant" | "distributor" | "buyer") => {
  const { client } = createDemoTestClient({ persona });
  return (await client["notifications.list"]({ limit: 100 })).items;
};

describe("demo accounts", () => {
  it("derives each persona's me from its person and account", async () => {
    const merchant = await createDemoTestClient({ persona: "merchant" }).client["account.me"]({});
    expect(merchant).toMatchObject({ address: main, isMerchant: true, payoutAddress: business });
    expect(merchant.workspaces.map((org) => org.id)).toEqual(["demo-m-1"]);
    const mara = await createDemoTestClient({ persona: "distributor" }).client["account.me"]({});
    expect(mara).toMatchObject({ handle: "mara", accountKind: "passkey", isMerchant: false });
    expect(mara.onboarding.intent).toBe("earn");
    expect(mara.recovery.checkedAt).not.toBeNull();
    const sam = await createDemoTestClient({ persona: "buyer" }).client["account.me"]({});
    expect(sam).toMatchObject({ accountKind: "wallet", recovery: { checkedAt: null } });
    await expect(
      createDemoTestClient({ persona: "buyer" }).client["account.recordRecoveryCheck"]({}),
    ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
  });

  it("checks handles against sample people, reserved words and the 30-day rule", async () => {
    const { client, advance } = createDemoTestClient({ persona: "distributor" });
    const taken = await client["account.handleAvailable"]({ handle: "tomas" });
    expect(taken).toMatchObject({ available: false, reason: "taken" });
    expect(taken.suggestions.length).toBeGreaterThan(0);
    expect(taken.suggestions.length).toBeLessThanOrEqual(3);
    expect(await client["account.handleAvailable"]({ handle: "demo-tomas" })).toMatchObject({
      reason: "invalid",
    });
    expect(await client["account.handleAvailable"]({ handle: "admin" })).toMatchObject({
      reason: "reserved",
    });
    expect(await client["account.handleAvailable"]({ handle: "mara" })).toMatchObject({
      available: true,
    });
    await expect(client["account.updateProfile"]({ handle: "tomas" })).rejects.toMatchObject({
      code: "HANDLE_TAKEN",
    });
    await expect(client["account.updateProfile"]({ handle: "support" })).rejects.toMatchObject({
      code: "HANDLE_RESERVED",
    });
    const unchanged = await client["account.updateProfile"]({ handle: "mara", bio: "Hi." });
    expect(unchanged).toMatchObject({ handle: "mara", handleChangeAvailableAt: null });
    const changed = await client["account.updateProfile"]({
      handle: "mara_shares",
      bio: "Templates I use.",
    });
    expect(changed).toMatchObject({ handle: "mara_shares", bio: "Templates I use." });
    expect(changed.handleChangeAvailableAt).not.toBeNull();
    await expect(client["account.updateProfile"]({ handle: "mara_l" })).rejects.toMatchObject({
      code: "HANDLE_CHANGE_TOO_SOON",
    });
    advance(31 * 86_400_000);
    expect((await client["account.updateProfile"]({ handle: "mara_l" })).handle).toBe("mara_l");
  });

  it("keeps the original passkey and serves vaults only for added ones", async () => {
    const { client } = createDemoTestClient({ persona: "distributor" });
    const labels = (await client["account.passkeys"]({})).map((passkey) => passkey.label);
    expect(labels).toEqual(["iCloud Keychain · iPhone", "1Password · Chrome on Windows"]);
    const added = credentialIdOf("mara:added");
    expect(await client["account.passkeyVault"]({ credentialId: added })).toMatchObject({
      demo: true,
    });
    const original = credentialIdOf("mara:original");
    await expect(client["account.passkeyVault"]({ credentialId: original })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      client["account.removePasskey"]({ credentialId: original, confirmationToken: token }),
    ).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
    await client["account.removePasskey"]({ credentialId: added, confirmationToken: token });
    expect(await client["account.passkeys"]({})).toHaveLength(1);
    expect((await client["notifications.list"]({ limit: 1 })).items[0]?.title).toBe(
      "Passkey removed",
    );
  });

  it("guards linked addresses: signer, payout, other accounts and limits", async () => {
    const { client } = createDemoTestClient({ persona: "merchant" });
    const wallets = await client["account.wallets"]({});
    expect(
      wallets.map((wallet) => [wallet.label, wallet.isPayout, wallet.isCurrentSigner]),
    ).toEqual([
      ["Main", false, true],
      ["Business", true, false],
      ["Studio Rabby", false, false],
    ]);
    const unlink = (address: string) =>
      client["account.unlinkWallet"]({ address, confirmationToken: token });
    await expect(unlink(main)).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
    await expect(unlink(business)).rejects.toMatchObject({ code: "NOT_AUTHORIZED" });
    await unlink(MERCHANT_SAMPLE_WALLET);
    await expect(
      client["account.linkWallet"](link(sampleAddress("person:1"))),
    ).rejects.toMatchObject({ code: "WALLET_ALREADY_LINKED" });
    for (const n of [1, 2, 3]) await client["account.linkWallet"](link(fresh(n), "passkey"));
    await expect(client["account.linkWallet"](link(fresh(4), "passkey"))).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    for (const n of [5, 6, 7, 8, 9]) await client["account.linkWallet"](link(fresh(n)));
    await expect(client["account.linkWallet"](link(fresh(10)))).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    const payout = await client["account.setPayoutAddress"]({
      address: main,
      confirmationToken: token,
    });
    expect(payout.isPayout).toBe(true);
    expect((await client["account.me"]({})).payoutAddress).toBe(main);
  });

  it("reports gas states per persona and drips once to an eligible account", async () => {
    const mara = createDemoTestClient({ persona: "distributor" }).client;
    expect((await mara["funding.status"]({})).gas.state).toBe("already_received");
    await expect(mara["funding.requestGas"]({})).rejects.toMatchObject({
      code: "GAS_ALREADY_RECEIVED",
    });
    const sam = createDemoTestClient({ persona: "buyer" }).client;
    expect((await sam["funding.status"]({})).gas.state).toBe("wallet_account");
    await expect(sam["funding.requestGas"]({})).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    const { client, runtime } = createDemoTestClient({ persona: "merchant" });
    expect((await client["funding.status"]({ address: business })).gas.state).toBe(
      "balance_sufficient",
    );
    const before = await client["funding.status"]({});
    expect(before).toMatchObject({ faucetLimit: "1000000000", gas: { state: "eligible" } });
    expect(before.covers?.createNode).toBe(false);
    const drip = await client["funding.requestGas"]({});
    expect(drip.amount).toBe("200000000000000000");
    const after = await client["funding.status"]({});
    expect(BigInt(after.monWei) - BigInt(before.monWei)).toBe(200000000000000000n);
    expect(after.gas).toMatchObject({ state: "received", lastDripTxHash: drip.txHash });
    expect(runtime.world.lastChainActionAt).toBe(runtime.now());
    expect((await client["account.activity"]({ filter: "funding" })).items[0]?.kind).toBe(
      "gasDrip",
    );
    await expect(client["funding.requestGas"]({})).rejects.toMatchObject({
      code: "GAS_ALREADY_RECEIVED",
    });
  });

  it("lists activity newest first with every transaction state for the distributor", async () => {
    const { client } = createDemoTestClient({ persona: "distributor" });
    const rows = (await client["account.activity"]({ limit: 100 })).items;
    expect(new Set(rows.map((row) => row.status))).toEqual(
      new Set([
        "not_submitted",
        "wallet_confirmation",
        "submitted",
        "included",
        "confirmed",
        "indexed",
        "done",
        "rejected",
        "unknown",
        "replaced",
        "failed",
      ]),
    );
    expect(rows.map((row) => row.at)).toEqual([...rows.map((row) => row.at)].sort().reverse());
    const firstPage = await client["account.activity"]({ limit: 5 });
    expect(firstPage.nextCursor).toBe("5");
    await expect(client["account.activity"]({ address: business })).rejects.toMatchObject({
      code: "NOT_AUTHORIZED",
    });
    const merchant = createDemoTestClient({ persona: "merchant" }).client;
    const kinds = (
      await merchant["account.activity"]({ address: business, filter: "campaigns", limit: 100 })
    ).items.map((row) => row.kind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "campaignCreated",
        "budgetFunded",
        "proceedsClaim",
        "campaignPaused",
      ]),
    );
    expect((await merchant["account.balances"]({ address: business })).sdusd).toBe("1240000000");
    expect((await merchant["account.balances"]({ address: fresh(42) })).monWei).toBe("0");
  });

  it("covers the catalogue keys each persona can receive, with valid shapes", async () => {
    const expected = {
      distributor: [
        "sale.reserved",
        "sale.readyToFinalize",
        "sale.finalized",
        "sale.refunded",
        "claim.confirmed",
        "link.ready",
        "link.childCreated",
        "campaign.paused",
        "campaign.ended",
        "campaign.exhausted",
        "campaign.termsChanging",
        "invitation.received",
        "invitation.expired",
        "account.signIn",
        "account.passkey",
        "account.gas",
        "export.ready",
      ],
      merchant: [
        "campaign.live",
        "campaign.budgetLow",
        "sale.new",
        "sale.readyToFinalize",
        "sale.finalized",
        "refund.requested",
        "claim.confirmed",
        "invitation.accepted",
        "invitation.declined",
        "invitation.expired",
        "team.memberJoined",
        "webhook.failing",
        "credential.expiring",
        "partnership.answered",
        "export.ready",
        "account.signIn",
        "account.wallet",
        "account.payout",
      ],
      buyer: [
        "purchase.confirmed",
        "purchase.final",
        "purchase.refunded",
        "refund.declined",
        "link.ready",
        "link.childCreated",
        "account.signIn",
      ],
    } as const;
    for (const persona of ["distributor", "merchant", "buyer"] as const) {
      const items = await allNotifications(persona);
      expect(new Set(items.map((item) => item.kind))).toEqual(new Set(expected[persona]));
      expect(items.every((item) => item.href.startsWith("/"))).toBe(true);
      expect(items.some((item) => item.readAt === null)).toBe(true);
      expect(
        clientMethodSchemas["notifications.list"].output.safeParse({ items, nextCursor: null })
          .success,
      ).toBe(true);
    }
  });

  it("marks notifications read and gates new ones by category preference", async () => {
    const { client, runtime } = createDemoTestClient({ persona: "distributor" });
    const unread = (await client["notifications.list"]({ unreadOnly: true, limit: 100 })).items;
    const first = unread[0];
    if (!first) throw new Error("The distributor should have unread notifications.");
    await client["notifications.markRead"]({ ids: [first.id] });
    expect(
      (await client["notifications.list"]({ unreadOnly: true, limit: 100 })).items,
    ).toHaveLength(unread.length - 1);
    await client["notifications.markRead"]({ all: true });
    expect((await client["notifications.list"]({ unreadOnly: true })).items).toEqual([]);
    const prefs = await client["notifications.updatePreferences"]({
      earnings: false,
      account: false,
    });
    expect(prefs).toMatchObject({ earnings: false, account: true });
    const before = (await client["notifications.list"]({ limit: 100 })).items.length;
    const body = {
      kind: "sale.reserved",
      category: "earnings",
      workspace: "earn",
      title: "New sale through your link",
      body: "Sample",
      href: "/earn/earnings",
    } as const;
    notify(runtime, runtime.personaId(), body);
    notify(runtime, runtime.personaId(), {
      ...body,
      kind: "account.signIn",
      category: "account",
      workspace: "account",
    });
    const after = (await client["notifications.list"]({ limit: 100 })).items;
    expect(after.length).toBe(before + 1);
    expect(after[0]?.kind).toBe("account.signIn");
  });

  it("files support items, refuses deletion and exports a sample file", async () => {
    const { client } = createDemoTestClient({ persona: "distributor" });
    expect((await client["support.mine"]({})).map((item) => item.status)).toEqual([
      "answered",
      "resolved",
    ]);
    const { ticketId } = await client["support.report"]({
      category: "abuse",
      message: "This link copies another distributor's post.",
      context: { page: "/c/demo-c-1" },
      target: { kind: "campaign", id: "demo-c-1" },
    });
    expect((await client["support.mine"]({}))[0]).toMatchObject({ id: ticketId, status: "open" });
    await expect(
      client["account.deleteAccount"]({
        confirmationToken: token,
        typedConfirmation: "delete my account",
      }),
    ).rejects.toMatchObject({
      code: "NOT_AUTHORIZED",
      message: "Demo accounts can't be deleted. Use Reset demo.",
    });
    const job = await client["account.exportData"]({ confirmationToken: token });
    expect(job).toMatchObject({
      status: "ready",
      url: `https://usespoke.xyz/demo/exports/${job.jobId}.json`,
    });
  });

  it("signs in and confirms through the simulated challenge", async () => {
    const { client } = createDemoTestClient({ persona: "merchant" });
    const challenge = await client["auth.challenge"]({
      address: main,
      chainId: 10143,
      purpose: "confirm",
      action: "Export your data",
    });
    expect(challenge.message).toContain(main);
    expect(challenge.message).toContain("Chain ID: 10143");
    expect(challenge.message).toContain(`Nonce: ${challenge.nonce}`);
    const confirmed = await client["auth.verify"]({ message: challenge.message, signature });
    const confirmation = "confirmationToken" in confirmed ? confirmed.confirmationToken : "";
    expect(confirmation).toMatch(/^[0-9a-f]{64}$/);
    const signIn = await client["auth.challenge"]({ address: main, chainId: 10143 });
    expect(await client["auth.verify"]({ message: signIn.message, signature })).toMatchObject({
      address: main,
      isNewAccount: false,
      csrfToken: "demo",
    });
  });

  it("replays account writes to the same state after reload", async () => {
    const first = createDemoTestClient({ persona: "merchant" });
    await first.client["account.updateProfile"]({ handle: "rhea_studio", displayName: "Rhea C." });
    await first.client["funding.requestGas"]({});
    await first.client["account.linkWallet"](link(fresh(77)));
    await first.client["notifications.markRead"]({ all: true });
    await first.client["support.contact"]({
      subject: "Refund timing",
      message: "How long does a refund take to show up?",
      email: "rhea@example.com",
    });
    const second = createDemoTestClient({
      persona: "merchant",
      snapshot: first.runtime.snapshot(),
    });
    expect(second.runtime.restore()).toBe("restored");
    for (const method of [
      "account.me",
      "account.wallets",
      "funding.status",
      "support.mine",
    ] as const)
      expect(await second.client[method]({})).toEqual(await first.client[method]({}));
    expect(await second.client["notifications.list"]({ limit: 100 })).toEqual(
      await first.client["notifications.list"]({ limit: 100 }),
    );
  });
});
