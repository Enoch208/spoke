import { omitFields } from "../services/chain.js";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { getAddress } from "viem";
import { z } from "zod";
import { stepUpInput, walletAddress, linkedWallet } from "@spoke/protocol";
import { challenges, confirmations, identities, records, sessions } from "../db/schema.js";
import { present, type StoredRecord } from "../db/store.js";
import { accountId, input, route, router, stepUp } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";

const walletView = (row: StoredRecord, payout: unknown, signer: string) =>
  linkedWallet.parse({
    ...present(row),
    derivationIndex: row.payload.derivationIndex ?? null,
    walletName: row.payload.walletName ?? null,
    label: row.payload.label ?? "",
    isPayout: String(row.payload.address).toLowerCase() === String(payout).toLowerCase(),
    isCurrentSigner: String(row.payload.address).toLowerCase() === signer.toLowerCase(),
  });

export const walletRoutes = (services: Services) => {
  const app = router();
  const { store } = services;
  route(app, services, "GET", "/me/wallets", "session", async (c) => {
    const account = await store.require("account", accountId(c));
    const { items } = await store.list("wallet", accountId(c), undefined, 10);
    return ok(
      c,
      items.map((row) => walletView(row, account.payload.payoutAddress, c.get("session").address)),
    );
  });
  route(app, services, "POST", "/me/wallets", "session", async (c) => {
    const body = await input(
      c,
      stepUpInput.extend({
        address: walletAddress,
        kind: z.enum(["wallet", "passkey", "phrase"]),
        derivationIndex: z.number().int().min(0).max(4).optional(),
        walletName: z.string().max(80).optional(),
        label: z.string().max(80).optional(),
        linkSignature: z
          .string()
          .regex(/^0x[\da-fA-F]+$/)
          .max(16384),
        nonce: z.string().max(100),
      }),
    );
    const { items } = await store.list("wallet", accountId(c), undefined, 11);
    if (
      items.length >= 10 ||
      (body.derivationIndex !== undefined &&
        items.filter((row) => typeof row.payload.derivationIndex === "number").length >= 5)
    )
      throw new ApiProblem(409, "NOT_ELIGIBLE", "Wallet limit reached.");
    const [challenge] = await store.db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.nonce, body.nonce),
          eq(challenges.accountId, accountId(c)),
          eq(challenges.purpose, "link"),
          gt(challenges.expiresAt, new Date()),
        ),
      );
    if (!challenge || challenge.address.toLowerCase() !== body.address.toLowerCase())
      throw new ApiProblem(401, "INVALID_SIGNATURE", "Request a wallet-link challenge first.");
    let valid: boolean;
    try {
      valid = await services.chain.verifySignature(
        getAddress(body.address),
        challenge.message,
        body.linkSignature as `0x${string}`,
      );
    } catch {
      throw new ApiProblem(401, "INVALID_SIGNATURE", "Wallet-link signature is invalid.");
    }
    if (!valid)
      throw new ApiProblem(401, "INVALID_SIGNATURE", "Wallet-link signature does not match.");
    await stepUp(c, services, "account.linkWallet", body.confirmationToken);
    const [consumed] = await store.db
      .delete(challenges)
      .where(eq(challenges.nonce, body.nonce))
      .returning();
    if (!consumed)
      throw new ApiProblem(409, "CONFLICT", "Wallet-link challenge has already been used.");
    const saved = await store.exclusive(`wallets:${accountId(c)}`, async () => {
      const current = await store.list("wallet", accountId(c), undefined, 11);
      if (
        current.items.length >= 10 ||
        (body.derivationIndex !== undefined &&
          (current.items.filter((row) => typeof row.payload.derivationIndex === "number").length >=
            5 ||
            current.items.some((row) => row.payload.derivationIndex === body.derivationIndex)))
      )
        throw new ApiProblem(
          409,
          "NOT_ELIGIBLE",
          "Wallet limit reached or this derivation index is already linked.",
        );
      await store.reserve("wallet", body.address.toLowerCase(), accountId(c));
      const wallet = omitFields(body, ["confirmationToken", "linkSignature", "nonce"]);
      return store.put("wallet", body.address.toLowerCase(), accountId(c), {
        ...wallet,
        derivationIndex: body.derivationIndex ?? null,
        walletName: body.walletName ?? null,
        label: body.label ?? "",
        linkedAt: new Date().toISOString(),
      });
    });
    const account = await store.require("account", accountId(c));
    return ok(c, walletView(saved, account.payload.payoutAddress, c.get("session").address), 201);
  });
  route(app, services, "PATCH", "/me/wallets/:address", "session", async (c) => {
    const address = walletAddress.parse(c.req.param("address") ?? "");
    const body = await input(c, z.strictObject({ label: z.string().max(80) }));
    const row = await store.require("wallet", address.toLowerCase(), accountId(c));
    return ok(
      c,
      walletView(
        await store.put("wallet", row.id, row.owner, { ...row.payload, ...body }),
        (await store.require("account", accountId(c))).payload.payoutAddress,
        c.get("session").address,
      ),
    );
  });
  route(app, services, "PUT", "/me/payout-address", "session", async (c) => {
    const body = await input(c, stepUpInput.extend({ address: walletAddress }));
    const wallet = await store.require("wallet", body.address.toLowerCase(), accountId(c));
    await stepUp(c, services, "account.setPayoutAddress", body.confirmationToken);
    const account = await store.require("account", accountId(c));
    await store.put("account", account.id, account.owner, {
      ...account.payload,
      payoutAddress: body.address,
    });
    await store.audit(accountId(c), "payout-address", body.address);
    return ok(c, walletView(wallet, body.address, c.get("session").address));
  });
  route(app, services, "DELETE", "/me/wallets/:address", "session", async (c) => {
    const address = walletAddress.parse(c.req.param("address") ?? "");
    const body = await input(c, stepUpInput);
    const account = await store.require("account", accountId(c));
    if (
      address.toLowerCase() === c.get("session").address.toLowerCase() ||
      address.toLowerCase() === String(account.payload.payoutAddress).toLowerCase() ||
      address.toLowerCase() === String(account.payload.address).toLowerCase()
    )
      throw new ApiProblem(
        409,
        "NOT_ELIGIBLE",
        "The primary, payout and current signing wallets must remain linked.",
      );
    await store.require("wallet", address.toLowerCase(), accountId(c));
    await stepUp(c, services, "account.unlinkWallet", body.confirmationToken);
    await store.db.transaction(async (tx) => {
      const revoked = await tx
        .delete(sessions)
        .where(
          and(
            eq(sessions.accountId, accountId(c)),
            sql`lower(${sessions.address}) = ${address.toLowerCase()}`,
          ),
        )
        .returning({ hash: sessions.hash });
      if (revoked.length)
        await tx.delete(confirmations).where(
          inArray(
            confirmations.sessionHash,
            revoked.map((row) => row.hash),
          ),
        );
      await tx
        .delete(challenges)
        .where(
          and(
            eq(challenges.accountId, accountId(c)),
            sql`lower(${challenges.address}) = ${address.toLowerCase()}`,
          ),
        );
      await tx
        .delete(records)
        .where(
          and(
            eq(records.kind, "access-grant"),
            eq(records.owner, accountId(c)),
            sql`lower(${records.payload}->>'buyer') = ${address.toLowerCase()}`,
          ),
        );
      await tx
        .delete(identities)
        .where(
          and(
            eq(identities.namespace, "wallet"),
            eq(identities.value, address.toLowerCase()),
            eq(identities.owner, accountId(c)),
          ),
        );
      await tx
        .delete(records)
        .where(
          and(
            eq(records.kind, "wallet"),
            eq(records.id, address.toLowerCase()),
            eq(records.owner, accountId(c)),
          ),
        );
    });
    return ok(c, { ok: true });
  });
  return app;
};
