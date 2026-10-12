import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { HOUR, iso, sampleHash } from "../../../../demo/world/ids";
import { scopedId } from "../../../../demo/world/seed-growth-plus-scope";
import type { RequestUsage, WebhookDelivery, WebhookEndpoint } from "../../../../demo/world/world";
import { fail } from "../handler";
import type { Window } from "./plus-integrations";
import { myMerchant, myRecord } from "./plus-merchant";

export const API_SCOPES = [
  "campaigns:read",
  "sales:read",
  "analytics:read",
  "reports:read",
  "drafts:write",
  "attestations:write",
  "webhooks:manage",
] as const;

export const WEBHOOK_EVENTS = [
  "campaign.funded",
  "campaign.status_changed",
  "campaign.budget_low",
  "campaign.budget_exhausted",
  "node.created",
  "sale.pending",
  "sale.refunded",
  "sale.finalized",
  "reward.claimed",
  "proceeds.claimed",
  "budget.withdrawn",
] as const;

export const STATUS_CLASSES = ["2xx", "4xx", "429", "5xx"] as const;

export const SECRET_OVERLAP_MS = 24 * HOUR;
const QUEUED_SEND_MS = 3_000;

const within = (catalogue: readonly string[], values: readonly string[], what: string) => {
  const unknown = values.filter((value) => !catalogue.includes(value));
  if (unknown.length) fail("VALIDATION_FAILED", `Unknown ${what}: ${unknown.join(", ")}.`);
  return [...new Set(values)];
};

export const checkedScopes = (scopes: readonly string[]) => within(API_SCOPES, scopes, "scope");

export const checkedEvents = (events: readonly string[]) =>
  within(WEBHOOK_EVENTS, events, "event type");

const privateV4 = (host: string) => {
  const parts = host.split(".").map(Number);
  const [a = 0, b = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
};

const privateV6 = (host: string) =>
  host === "::" ||
  host === "::1" ||
  /^f[cd]/.test(host) ||
  /^fe[89ab]/.test(host) ||
  (host.startsWith("::ffff:") && privateV4(host.slice(7)));

export const isPublicHttps = (url: string): boolean => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !privateV4(host);
  if (host.includes(":")) return !privateV6(host);
  const local = ["localhost", ".localhost", ".local", ".internal", ".home.arpa"];
  return host.includes(".") && !local.some((suffix) => host === suffix || host.endsWith(suffix));
};

export const webhookSecret = (endpointId: string, version: number) =>
  `whsec_demo_${sampleHash(`webhook-secret:${endpointId}:${String(version)}`).slice(2, 42)}`;

export const presentDelivery = (delivery: WebhookDelivery, now: number): WebhookDelivery =>
  delivery.status === "queued" && Date.parse(delivery.createdAt) + QUEUED_SEND_MS <= now
    ? { ...delivery, status: "delivered", httpStatus: 200, nextAttemptAt: null }
    : { ...delivery };

export const isReplayable = (delivery: WebhookDelivery) =>
  delivery.status === "delivered" ||
  delivery.status === "cancelled" ||
  (delivery.status === "failed" && delivery.nextAttemptAt === null);

export const hasPendingRetry = (delivery: WebhookDelivery) =>
  delivery.status === "queued" ||
  delivery.status === "sending" ||
  (delivery.status === "failed" && delivery.nextAttemptAt !== null);

const classOf = (status: number): (typeof STATUS_CLASSES)[number] => {
  if (status === 429) return "429";
  if (status >= 500) return "5xx";
  return status >= 400 ? "4xx" : "2xx";
};

export const usageView = (requests: readonly RequestUsage[], window: Window) => {
  const inWindow = requests
    .filter((request) => {
      const at = Date.parse(request.at);
      return at >= window.from && at <= window.to;
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const hourly = [];
  for (let hour = Math.floor(window.from / HOUR) * HOUR; hour <= window.to; hour += HOUR) {
    const inHour = inWindow.filter((request) => {
      const at = Date.parse(request.at);
      return at >= hour && at < hour + HOUR;
    });
    for (const statusClass of STATUS_CLASSES)
      hourly.push({
        at: iso(hour),
        statusClass,
        count: inHour.filter((request) => classOf(request.status) === statusClass).length,
      });
  }
  return { hourly, requests: inWindow.slice(0, 50).map((request) => ({ ...request })) };
};

export const appendDelivery = (
  runtime: DemoRuntime,
  endpoint: WebhookEndpoint,
  fields: Pick<WebhookDelivery, "eventId" | "status" | "httpStatus" | "nextAttemptAt">,
): WebhookDelivery => {
  const delivery: WebhookDelivery = {
    id: scopedId(endpoint.id, "delivery", `n${String(runtime.nextId("plus:delivery"))}`),
    endpointId: endpoint.id,
    attempt: 1,
    createdAt: iso(runtime.now()),
    ...fields,
  };
  runtime.world.deliveries.push(delivery);
  return { ...delivery };
};

export const enabledEndpoint = (runtime: DemoRuntime, id: string) => {
  const endpoint = myRecord(myMerchant(runtime), runtime.world.webhooks, id, "That endpoint");
  if (!endpoint.enabled)
    fail("VALIDATION_FAILED", "Enable the endpoint first. Disabled endpoints receive nothing.");
  return endpoint;
};
