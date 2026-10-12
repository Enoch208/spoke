import { DAY, HOUR, MINUTE, iso, sampleHash } from "./ids";
import { personaMerchant, scopedId } from "./seed-growth-plus-scope";
import type { DemoCore } from "./types";
import type { ApiKey, RequestUsage, WebhookDelivery, WebhookEndpoint } from "./world";

export const MAX_DELIVERY_ATTEMPTS = 7;

export const apiKeySecret = (id: string) => `spk_demo_${sampleHash(`api-key:${id}`).slice(2)}`;

export const apiKeyPrefix = (id: string) => apiKeySecret(id).slice(0, 13);

export const requestIdPrefix = (keyId: string) => `demo-req-${keyId.replace(/^demo-/, "")}-`;

const keyRows = [
  {
    n: 1,
    name: "Reporting job",
    scopes: ["sales:read", "reports:read"],
    created: 26,
    used: 3 / 24,
  },
  {
    n: 2,
    name: "Old staging key",
    scopes: ["campaigns:read", "drafts:write"],
    created: 120,
    used: 40,
  },
] as const;

export const apiKeyNamesFor = (merchantId: string): Record<string, string> =>
  Object.fromEntries(keyRows.map((row) => [scopedId(merchantId, "key", row.n), row.name]));

const runSteps = [
  ["GET", "/v1/merchant/sales"],
  ["GET", "/v1/merchant/sales?cursor=next"],
  ["POST", "/v1/merchant/reports"],
  ["GET", "/v1/merchant/reports/latest"],
] as const;

const failedRequests: Readonly<Record<number, number>> = { 13: 429, 26: 500, 39: 404 };

const usageOf = (keyId: string, lastUsedAt: number): RequestUsage[] =>
  Array.from({ length: 13 }, (_, run) =>
    runSteps.map(([method, path], step): RequestUsage => {
      const index = run * runSteps.length + step;
      return {
        at: iso(lastUsedAt - (12 - run) * 2 * HOUR - (runSteps.length - 1 - step) * 4_000),
        method,
        path,
        status: failedRequests[index] ?? (method === "POST" ? 202 : 200),
        latencyMs: 40 + ((index * 47) % 260),
        requestId: `${requestIdPrefix(keyId)}${String(index + 1)}`,
      };
    }),
  ).flat();

export const webhookEventId = (resource: string, kind: string) =>
  `demo-evt-${resource.replace(/^demo-/, "")}-${kind}`;

const deliveriesOf = (core: DemoCore, endpointId: string, scope: string): WebhookDelivery[] => {
  const anchor = core.anchor;
  const since = anchor - 7 * DAY;
  const campaigns = core.campaigns.filter((campaign) => campaign.merchantId === scope);
  const ids = new Set(campaigns.map((campaign) => campaign.id));
  const saleEvents = core.sales
    .filter((sale) => ids.has(sale.campaignId))
    .flatMap((sale) =>
      (
        [
          ["pending", sale.purchasedAt],
          ["finalized", sale.finalizedAt],
          ["refunded", sale.refundedAt],
        ] as const
      ).flatMap(([kind, at]) =>
        at !== null && at >= since && at <= anchor
          ? [{ eventId: webhookEventId(sale.id, kind), at }]
          : [],
      ),
    );
  const paused = campaigns.find((campaign) => campaign.status === "paused");
  const budgetEvents = paused
    ? [{ eventId: webhookEventId(paused.id, "budget-low"), at: anchor - 4 * DAY }]
    : [];
  const events = [...saleEvents, ...budgetEvents].sort((a, b) => a.at - b.at);
  const deadLettered = events.findLast((event) => event.at <= anchor - 2 * DAY);
  const retrying = events.findLast((event) => event.at <= anchor - 10 * MINUTE);
  return events.map((event, index): WebhookDelivery => {
    const base = {
      id: scopedId(endpointId, "delivery", index + 1),
      endpointId,
      eventId: event.eventId,
      createdAt: iso(event.at + 2_000),
    };
    if (event === deadLettered)
      return {
        ...base,
        attempt: MAX_DELIVERY_ATTEMPTS,
        status: "failed",
        httpStatus: 500,
        nextAttemptAt: null,
      };
    if (event === retrying)
      return {
        ...base,
        attempt: 3,
        status: "failed",
        httpStatus: 503,
        nextAttemptAt: iso(anchor + 28 * MINUTE),
      };
    return { ...base, attempt: 1, status: "delivered", httpStatus: 200, nextAttemptAt: null };
  });
};

export const seedDeveloper = (core: DemoCore) => {
  const scope = personaMerchant(core).id;
  const anchor = core.anchor;
  const apiKeys: ApiKey[] = keyRows.map((row) => {
    const id = scopedId(scope, "key", row.n);
    return {
      id,
      prefix: apiKeyPrefix(id),
      scopes: [...row.scopes],
      createdAt: iso(anchor - row.created * DAY),
      lastUsedAt: iso(anchor - row.used * DAY),
      revokedAt: row.n === 2 ? iso(anchor - 29 * DAY) : null,
    };
  });
  const reportingKey = scopedId(scope, "key", 1);
  const webhook: WebhookEndpoint = {
    id: scopedId(scope, "hook", 1),
    url: "https://hooks.example.com/northbeam/spoke",
    events: ["sale.pending", "sale.finalized", "sale.refunded", "campaign.budget_low"],
    enabled: true,
    createdAt: iso(anchor - 24 * DAY),
  };
  return {
    apiKeys,
    apiUsage: usageOf(reportingKey, anchor - 3 * HOUR),
    webhooks: [webhook],
    deliveries: deliveriesOf(core, webhook.id, scope),
  };
};
