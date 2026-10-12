import { DAY, iso } from "../../../../demo/world/ids";
import { emptyStatus } from "../../../../demo/world/seed-growth-plus-integrations";
import type { Attestation, Integration, OrderSigner } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { page } from "../views/basics";
import {
  integrationIdOf,
  integrationOf,
  presentIntegration,
  replaceIn,
  signingPolicy,
  statusView,
  windowOf,
} from "./plus-integrations";
import { freshId, mine, myMerchant, myRecord, newestFirst, recordAudit } from "./plus-merchant";

export const integrationsReads = {
  "integrations.list": (_input, runtime) =>
    mine(myMerchant(runtime), runtime.world.integrations).map((integration) =>
      presentIntegration(integration, runtime.now()),
    ),
  "integrations.status": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const now = runtime.now();
    return statusView(
      runtime.world,
      merchant,
      integrationOf(runtime.world, merchant, input.provider),
      {
        now,
        window: windowOf(undefined, now),
        refresh: input.refresh ?? false,
      },
    );
  },
  "integrations.reconciliation": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const now = runtime.now();
    return statusView(
      runtime.world,
      merchant,
      integrationOf(runtime.world, merchant, input.provider),
      {
        now,
        window: windowOf(input.range, now),
        refresh: false,
        ...(input.campaignIds ? { campaignIds: input.campaignIds } : {}),
      },
    );
  },
} satisfies PartialHandlers<"integrations">;

export const integrationsWrites = {
  "integrations.connect": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const now = iso(runtime.now());
    const id = integrationIdOf(merchant, input.provider);
    const existing = runtime.world.integrations.find((integration) => integration.id === id);
    const connected: Integration =
      existing?.status === "connected"
        ? existing
        : { id, provider: input.provider, status: "connected", connectedAt: now, lastSyncAt: now };
    runtime.world.integrationStatus[id] ??= emptyStatus();
    recordAudit(runtime, merchant, "integrations.connect", id, existing ?? null, connected);
    return presentIntegration(replaceIn(runtime.world.integrations, connected), runtime.now());
  },
  "integrations.disconnect": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const existing = integrationOf(runtime.world, merchant, input.provider);
    const disconnected: Integration = { ...existing, status: "disconnected" };
    replaceIn(runtime.world.integrations, disconnected);
    recordAudit(runtime, merchant, "integrations.disconnect", existing.id, existing, disconnected);
    return { ok: true as const };
  },
  "integrations.resolveMismatch": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const integration = found(
      mine(merchant, runtime.world.integrations).find((candidate) =>
        runtime.world.integrationStatus[candidate.id]?.mismatches.some(
          (mismatch) => mismatch.id === input.id,
        ),
      ),
      "That difference",
    );
    const status = runtime.world.integrationStatus[integration.id] ?? emptyStatus();
    const mismatch = found(
      status.mismatches.find((candidate) => candidate.id === input.id),
      "That difference",
    );
    runtime.world.integrationStatus[integration.id] = {
      ...status,
      mismatches: status.mismatches.filter((candidate) => candidate.id !== input.id),
    };
    return recordAudit(runtime, merchant, "integrations.resolveMismatch", input.id, mismatch, {
      ...mismatch,
      explanation: input.note,
    });
  },
} satisfies PartialHandlers<"integrations">;

const MAX_SIGNER_DAYS = 365;

const isActive = (signer: OrderSigner, now: number) =>
  signer.revokedAt === null && Date.parse(signer.expiry) > now;

export const signersReads = {
  "signers.list": (_input, runtime) => ({
    items: mine(myMerchant(runtime), runtime.world.signers).map((signer) => ({ ...signer })),
    policy: signingPolicy,
  }),
  "signers.attestations": (input, runtime) => {
    const signer = myRecord(myMerchant(runtime), runtime.world.signers, input.id, "That signer");
    const attempts = newestFirst(
      runtime.world.attestations
        .filter((attempt) => attempt.signerId === signer.id)
        .filter((attempt) => input.outcome === undefined || attempt.outcome === input.outcome)
        .filter((attempt) => input.nonce === undefined || attempt.nonce === input.nonce),
      (attempt) => attempt.at,
    ).map((attempt): Attestation => ({
      id: attempt.id,
      orderHash: attempt.orderHash,
      nonce: attempt.nonce,
      campaignId: attempt.campaignId,
      amount: attempt.amount,
      outcome: attempt.outcome,
      saleId: attempt.saleId,
      at: attempt.at,
    }));
    return page(attempts, input);
  },
} satisfies PartialHandlers<"signers">;

export const signersWrites = {
  "signers.add": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const now = runtime.now();
    const expiry = Date.parse(input.expiry);
    if (expiry <= now || expiry > now + MAX_SIGNER_DAYS * DAY)
      fail("VALIDATION_FAILED", "Choose an expiry between now and 365 days from today.");
    if (
      BigInt(input.limits.perOrder) <= 0n ||
      BigInt(input.limits.daily) < BigInt(input.limits.perOrder)
    )
      fail(
        "VALIDATION_FAILED",
        "The daily cap must be at least the per-order limit, and both above zero.",
      );
    if (!input.scopes.length)
      fail("VALIDATION_FAILED", "Choose at least one campaign or store for this signer.");
    const duplicate = mine(merchant, runtime.world.signers).some(
      (signer) =>
        isActive(signer, now) && signer.address.toLowerCase() === input.address.toLowerCase(),
    );
    if (duplicate) fail("CONFLICT", "That address is already an active order signer.");
    const signer: OrderSigner = {
      id: freshId(runtime, merchant.id, "signer"),
      address: input.address,
      scopes: [...input.scopes],
      limits: { ...input.limits },
      expiry: iso(expiry),
      revokedAt: null,
      usedToday: "0",
    };
    recordAudit(runtime, merchant, "signers.add", signer.id, null, signer);
    return replaceIn(runtime.world.signers, signer);
  },
  "signers.revoke": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const signer = myRecord(merchant, runtime.world.signers, input.id, "That signer");
    if (signer.revokedAt !== null) fail("CONFLICT", "That signer is already revoked.");
    const revoked: OrderSigner = { ...signer, revokedAt: iso(runtime.now()) };
    recordAudit(runtime, merchant, "signers.revoke", signer.id, signer, revoked);
    return replaceIn(runtime.world.signers, revoked);
  },
} satisfies PartialHandlers<"signers">;
