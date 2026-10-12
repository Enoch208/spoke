import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { deleteCookie, setCookie } from "hono/cookie";
import { getAddress } from "viem";
import { createSiweMessage, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { challengeInput, verifyInput } from "@spoke/protocol";
import { challenges, confirmations, records, sessions } from "../db/schema.js";
import { digest, newId } from "../db/store.js";
import { accountId, input, requireSession, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";

export const authRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  const cookieName = services.production ? "__Host-spoke_session" : "spoke_session";
  route(app, services, "POST", "/auth/challenge", "public", async (c) => {
    if (c.req.header("origin") !== services.webOrigin)
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Sign-in origin is not allowed.");
    await store.rate(`auth:${c.get("ip")}`, 15, 300);
    const body = await input(c, challengeInput);
    if (body.chainId !== chain.chainId)
      throw new ApiProblem(400, "WRONG_NETWORK", "Switch to the configured network.");
    if (body.purpose !== "signIn") await requireSession(c, services);
    if (
      body.purpose === "confirm" &&
      (!body.action || body.address.toLowerCase() !== c.get("session").address.toLowerCase())
    )
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "Confirmation must name an action and the current signer.",
      );
    const nonce = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 300_000);
    const message = createSiweMessage({
      address: body.address,
      chainId: body.chainId,
      domain: new URL(services.webOrigin).host,
      uri: services.webOrigin,
      version: "1",
      nonce,
      issuedAt: new Date(),
      expirationTime: expiresAt,
      statement:
        body.purpose === "confirm"
          ? `Confirm Spoke action: ${body.action ?? ""}. No transaction will be sent.`
          : body.purpose === "link"
            ? "Link this wallet to your Spoke account. No transaction will be sent."
            : "Sign in to Spoke. No transaction will be sent.",
    });
    await store.db.insert(challenges).values({
      nonce,
      address: body.address,
      message,
      kind: body.accountKind,
      purpose: body.purpose,
      action: body.action ?? null,
      accountId: body.purpose === "signIn" ? null : accountId(c),
      expiresAt,
    });
    return ok(c, { message, nonce, expiresAt: expiresAt.toISOString() });
  });
  route(app, services, "POST", "/auth/verify", "public", async (c) => {
    if (c.req.header("origin") !== services.webOrigin)
      throw new ApiProblem(403, "NOT_AUTHORIZED", "Sign-in origin is not allowed.");
    await store.rate(`verify:${c.get("ip")}`, 30, 300);
    const body = await input(c, verifyInput);
    const parsed = parseSiweMessage(body.message);
    if (!parsed.nonce) throw new ApiProblem(401, "INVALID_SIGNATURE", "Invalid sign-in message.");
    const [challenge] = await store.db
      .select()
      .from(challenges)
      .where(and(eq(challenges.nonce, parsed.nonce), gt(challenges.expiresAt, new Date())))
      .limit(1);
    if (
      !challenge ||
      challenge.message !== body.message ||
      !validateSiweMessage({
        message: parsed,
        domain: new URL(services.webOrigin).host,
        address: getAddress(challenge.address),
        nonce: challenge.nonce,
      }) ||
      parsed.chainId !== chain.chainId ||
      parsed.uri !== services.webOrigin
    )
      throw new ApiProblem(401, "INVALID_SIGNATURE", "Challenge expired or does not match.");
    let valid: boolean;
    try {
      valid = await chain.verifySignature(
        getAddress(challenge.address),
        body.message,
        body.signature as `0x${string}`,
      );
    } catch {
      throw new ApiProblem(401, "INVALID_SIGNATURE", "Signature could not be verified.");
    }
    if (!valid)
      throw new ApiProblem(401, "INVALID_SIGNATURE", "Signature does not match this wallet.");
    if (body.method !== challenge.kind)
      throw new ApiProblem(
        401,
        "INVALID_SIGNATURE",
        "Sign-in method does not match this challenge.",
      );
    const [consumed] = await store.db
      .delete(challenges)
      .where(and(eq(challenges.nonce, challenge.nonce), gt(challenges.expiresAt, new Date())))
      .returning();
    if (!consumed)
      throw new ApiProblem(401, "INVALID_SIGNATURE", "This challenge has already been used.");
    if (challenge.purpose !== "signIn") {
      const session = await requireSession(c, services);
      if (session.accountId !== challenge.accountId)
        throw new ApiProblem(403, "NOT_AUTHORIZED", "Challenge belongs to another account.");
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 300_000);
      await store.db.insert(confirmations).values({
        hash: digest(token),
        sessionHash: session.hash,
        action:
          challenge.purpose === "link"
            ? `link:${challenge.address.toLowerCase()}`
            : (challenge.action ?? ""),
        expiresAt,
      });
      return ok(c, { confirmationToken: token, expiresAt: expiresAt.toISOString() });
    }
    const address = getAddress(challenge.address);
    const linkedOwner = await store.identity("wallet", address.toLowerCase());
    if (challenge.kind === "phrase" && !linkedOwner)
      return ok(c, { address, isNewAccount: true, session: null });
    const owner = linkedOwner ?? address.toLowerCase();
    const token = randomBytes(32).toString("hex");
    const csrfToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 86_400_000);
    const inserted = await store.db
      .insert(records)
      .values({
        kind: "account",
        id: owner,
        owner,
        payload: {
          address,
          accountKind: challenge.kind,
          handle: null,
          displayName: "",
          avatarSeed: owner,
          bio: "",
          website: null,
          payoutAddress: address,
          onboarding: { intent: null, completedAt: null },
          recovery: { checkedAt: null },
          handleChangedAt: null,
          handleChangeAvailableAt: null,
          visibility: { level: "private", fields: [], acceptsInvitations: false },
        },
      })
      .onConflictDoNothing()
      .returning();
    await store.reserve("wallet", address.toLowerCase(), owner);
    if (inserted.length)
      await store.put("wallet", address.toLowerCase(), owner, {
        address,
        kind: challenge.kind,
        label: "",
        derivationIndex: null,
        walletName: null,
        linkedAt: new Date().toISOString(),
      });
    await store.db.insert(sessions).values({
      hash: digest(token),
      id: newId(),
      accountId: owner,
      address,
      csrfHash: digest(csrfToken),
      method: body.method,
      deviceLabel: (c.req.header("user-agent") ?? "Unknown device").slice(0, 200),
      expiresAt,
    });
    setCookie(c, cookieName, token, {
      httpOnly: true,
      secure: services.production,
      sameSite: "Lax",
      path: "/",
      maxAge: 86_400,
    });
    c.header("cache-control", "no-store");
    return ok(c, {
      address,
      chainId: chain.chainId,
      expiresAt: expiresAt.toISOString(),
      isNewAccount: inserted.length > 0,
      csrfToken,
    });
  });
  route(app, services, "POST", "/auth/sign-out", "session", async (c) => {
    await store.db.delete(sessions).where(eq(sessions.hash, c.get("session").hash));
    deleteCookie(c, cookieName, { path: "/", secure: services.production });
    return ok(c, { ok: true });
  });
  return app;
};
