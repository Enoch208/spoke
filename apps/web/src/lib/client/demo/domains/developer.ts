import { DAY, iso } from "../../../../demo/world/ids";
import {
  apiKeyPrefix,
  apiKeySecret,
  requestIdPrefix,
} from "../../../../demo/world/seed-growth-plus-developer";
import { isScopedTo } from "../../../../demo/world/seed-growth-plus-scope";
import type { ApiKey, WebhookEndpoint } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { page } from "../views/basics";
import {
  SECRET_OVERLAP_MS,
  appendDelivery,
  checkedEvents,
  enabledEndpoint,
  checkedScopes,
  hasPendingRetry,
  isPublicHttps,
  isReplayable,
  presentDelivery,
  usageView,
  webhookSecret,
} from "./plus-developer";
import { replaceIn } from "./plus-integrations";
import { freshId, mine, myMerchant, myRecord, newestFirst, recordAudit } from "./plus-merchant";

export const apiKeysReads = {
  "apiKeys.list": (_input, runtime) =>
    mine(myMerchant(runtime), runtime.world.apiKeys).map((key) => ({
      ...key,
      scopes: [...key.scopes],
    })),
  "apiKeys.usage": (input, runtime) => {
    const key = myRecord(myMerchant(runtime), runtime.world.apiKeys, input.id, "That API key");
    const now = runtime.now();
    const window = input.range
      ? { from: Date.parse(input.range.from), to: Date.parse(input.range.to) }
      : { from: now - DAY, to: now };
    const prefix = requestIdPrefix(key.id);
    return usageView(
      runtime.world.apiUsage.filter((request) => request.requestId.startsWith(prefix)),
      window,
    );
  },
} satisfies PartialHandlers<"apiKeys">;

export const apiKeysWrites = {
  "apiKeys.create": (input, runtime) => {
    const merchant = myMerchant(runtime);
    if (!input.name.trim()) fail("VALIDATION_FAILED", "Give the key a name.");
    const id = freshId(runtime, merchant.id, "key");
    const key: ApiKey = {
      id,
      prefix: apiKeyPrefix(id),
      scopes: checkedScopes(input.scopes),
      createdAt: iso(runtime.now()),
      lastUsedAt: null,
      revokedAt: null,
    };
    recordAudit(runtime, merchant, "apiKeys.create", id, null, key);
    return { ...replaceIn(runtime.world.apiKeys, key), secret: apiKeySecret(id) };
  },
  "apiKeys.revoke": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const key = myRecord(merchant, runtime.world.apiKeys, input.id, "That API key");
    if (key.revokedAt !== null) fail("CONFLICT", "That key is already revoked.");
    const revoked: ApiKey = { ...key, revokedAt: iso(runtime.now()) };
    replaceIn(runtime.world.apiKeys, revoked);
    recordAudit(runtime, merchant, "apiKeys.revoke", key.id, key, revoked);
    return { ok: true as const };
  },
} satisfies PartialHandlers<"apiKeys">;

export const webhooksReads = {
  "webhooks.list": (_input, runtime) =>
    mine(myMerchant(runtime), runtime.world.webhooks).map((endpoint) => ({
      ...endpoint,
      events: [...endpoint.events],
    })),
  "webhooks.deliveries": (input, runtime) => {
    const merchant = myMerchant(runtime);
    if (!isScopedTo(merchant.id, input.id))
      fail("NOT_FOUND", "That endpoint isn't in the sample world.");
    const now = runtime.now();
    const deliveries = newestFirst(
      runtime.world.deliveries
        .filter((delivery) => delivery.endpointId === input.id)
        .map((delivery) => presentDelivery(delivery, now)),
      (delivery) => delivery.createdAt,
    );
    return page(deliveries, input);
  },
} satisfies PartialHandlers<"webhooks">;

export const webhooksWrites = {
  "webhooks.create": (input, runtime) => {
    const merchant = myMerchant(runtime);
    if (!isPublicHttps(input.url))
      fail(
        "WEBHOOK_URL_NOT_ALLOWED",
        "Use a public HTTPS address. Private and local addresses aren't allowed.",
      );
    const endpoint: WebhookEndpoint = {
      id: freshId(runtime, merchant.id, "hook"),
      url: input.url,
      events: checkedEvents(input.events),
      enabled: true,
      createdAt: iso(runtime.now()),
    };
    recordAudit(runtime, merchant, "webhooks.create", endpoint.id, null, endpoint);
    return {
      ...replaceIn(runtime.world.webhooks, endpoint),
      secret: webhookSecret(endpoint.id, 1),
    };
  },
  "webhooks.test": (input, runtime) =>
    appendDelivery(runtime, enabledEndpoint(runtime, input.id), {
      eventId: `demo-evt-test-n${String(runtime.nextId("plus:test-event"))}`,
      status: "delivered",
      httpStatus: 200,
      nextAttemptAt: null,
    }),
  "webhooks.update": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const endpoint = myRecord(merchant, runtime.world.webhooks, input.id, "That endpoint");
    const updated: WebhookEndpoint = {
      ...endpoint,
      events: input.events ? checkedEvents(input.events) : endpoint.events,
      enabled: input.enabled ?? endpoint.enabled,
    };
    if (!updated.events.length) fail("VALIDATION_FAILED", "Choose at least one event type.");
    recordAudit(runtime, merchant, "webhooks.update", endpoint.id, endpoint, updated);
    return replaceIn(runtime.world.webhooks, updated);
  },
  "webhooks.rotateSecret": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const endpoint = myRecord(merchant, runtime.world.webhooks, input.id, "That endpoint");
    const version = runtime.nextId(`plus:secret:${endpoint.id}`) + 1;
    recordAudit(
      runtime,
      merchant,
      "webhooks.rotateSecret",
      endpoint.id,
      { version: version - 1 },
      { version },
    );
    return {
      secret: webhookSecret(endpoint.id, version),
      oldSecretExpiresAt: iso(runtime.now() + SECRET_OVERLAP_MS),
    };
  },
  "webhooks.remove": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const endpoint = myRecord(merchant, runtime.world.webhooks, input.id, "That endpoint");
    const world = runtime.world;
    world.webhooks = world.webhooks.filter((candidate) => candidate.id !== endpoint.id);
    world.deliveries = world.deliveries.map((delivery) =>
      delivery.endpointId === endpoint.id && hasPendingRetry(delivery)
        ? { ...delivery, status: "cancelled", nextAttemptAt: null }
        : delivery,
    );
    recordAudit(runtime, merchant, "webhooks.remove", endpoint.id, endpoint, null);
    return { ok: true as const };
  },
  "webhooks.replay": (input, runtime) => {
    const merchant = myMerchant(runtime);
    const delivery = found(
      runtime.world.deliveries.find(
        (candidate) => candidate.id === input.id && isScopedTo(merchant.id, candidate.endpointId),
      ),
      "That delivery",
    );
    const current = presentDelivery(delivery, runtime.now());
    if (!isReplayable(current))
      fail(
        "CONFLICT",
        "This delivery is still being retried. Replay it once it's delivered or dead-lettered.",
      );
    const endpoint = enabledEndpoint(runtime, delivery.endpointId);
    const replayed = appendDelivery(runtime, endpoint, {
      eventId: delivery.eventId,
      status: "queued",
      httpStatus: null,
      nextAttemptAt: iso(runtime.now()),
    });
    recordAudit(runtime, merchant, "webhooks.replay", replayed.id, delivery, replayed);
    return replayed;
  },
} satisfies PartialHandlers<"webhooks">;
