import { clientMethodSchemas, type ClientMethod, type ClientOutput } from "@spoke/protocol";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso } from "../../../../demo/world/ids";
import { liveRoutes } from "../../live/routes";
import { DEMO_CHAIN_ID, DEMO_PROTOCOL_ADDRESS, blockAt } from "../views/basics";
import { campaignCard, campaignOf } from "../views/catalog";
import { demoHealth } from "./platform-health";

type Endpoint = ClientOutput<"system.endpoints">[number];
type PlaygroundAnswer = ClientOutput<"playground.run">;

const tightlyLimited = new Set<string>([
  "account.handleAvailable",
  "account.passkeyVault",
  "funding.requestGas",
  "invitations.send",
  "distributors.search",
  "links.recordOpen",
  "playground.run",
]);

const isMethod = (name: string): name is ClientMethod => Object.hasOwn(clientMethodSchemas, name);

const authOf = (
  method: ClientMethod,
  path: string,
  auth: "public" | "session",
): Endpoint["auth"] => {
  if (method.startsWith("ops.")) return "operator";
  if (path.startsWith("/merchant")) return "merchant";
  return auth;
};

const rateOf = (method: ClientMethod, auth: Endpoint["auth"]): Endpoint["rateLimit"] => {
  if (tightlyLimited.has(method) || /^(auth|support)\./.test(method))
    return { requests: 10, windowSeconds: 60 };
  return auth === "public"
    ? { requests: 120, windowSeconds: 60 }
    : { requests: 300, windowSeconds: 60 };
};

export const designedEndpoints = (): Endpoint[] =>
  Object.keys(clientMethodSchemas)
    .filter(isMethod)
    .map((method) => {
      const route = liveRoutes[method];
      const auth = authOf(method, route.path, route.auth);
      return {
        method: route.verb,
        path: `/v1${route.path}`,
        auth,
        inputSchema: `${method}.input`,
        outputSchema: `${method}.output`,
        rateLimit: rateOf(method, auth),
        apiVersion: "v1",
        availability: "designed",
      };
    });

const PLAYGROUND_PATHS = "/v1/health, /v1/campaigns and /v1/campaigns/{id}";

const pathOf = (raw: string): string => {
  const trimmed = raw.trim();
  if (!/^https?:\/\//.test(trimmed)) return trimmed.split(/[?#]/)[0] ?? trimmed;
  try {
    return new URL(trimmed).pathname;
  } catch {
    return trimmed;
  }
};

const answer = (status: number, payload: unknown): PlaygroundAnswer => {
  const body = JSON.stringify(payload);
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-spoke-mode": "demo",
      "x-request-id": "demo",
    },
    body,
    durationMs: 0,
    size: new TextEncoder().encode(body).length,
  };
};

const notFound = (message: string) =>
  answer(404, { error: { code: "NOT_FOUND", message, retryable: false, requestId: "demo" } });

const envelope = (runtime: DemoRuntime, data: unknown) => {
  const now = runtime.now();
  return {
    requestId: "demo",
    timestamp: iso(now),
    schemaVersion: "3.0",
    chainId: DEMO_CHAIN_ID,
    contractAddress: DEMO_PROTOCOL_ADDRESS,
    blockNumber: blockAt(now),
    indexingStatus: runtime.indexingStatus(),
    data,
  };
};

export const runPlayground = (rawPath: string, runtime: DemoRuntime): PlaygroundAnswer => {
  const path = pathOf(rawPath).replace(/\/+$/, "");
  const { world } = runtime;
  const now = runtime.now();
  if (path === "/v1/health") return answer(200, envelope(runtime, demoHealth(runtime)));
  if (path === "/v1/campaigns") {
    const cards = world.campaigns
      .filter((campaign) => !campaign.hidden)
      .map((campaign) => campaignCard(world, campaign, now));
    return answer(200, envelope(runtime, { items: cards, nextCursor: null }));
  }
  const match = /^\/v1\/campaigns\/([^/]+)$/.exec(path);
  if (match?.[1] !== undefined) {
    const campaign = campaignOf(world, match[1]);
    if (!campaign || campaign.hidden)
      return notFound("No campaign with this ID in the sample world.");
    return answer(200, envelope(runtime, campaignCard(world, campaign, now)));
  }
  return notFound(`The demo playground answers only ${PLAYGROUND_PATHS}.`);
};
