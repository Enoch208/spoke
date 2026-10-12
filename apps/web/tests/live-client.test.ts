import { describe, expect, it, vi } from "vitest";
import { ClientError } from "@/lib/client/errors";
import { buildRequest, callLive, type HttpConfig } from "@/lib/client/live/http";
import { liveRoutes, routeFor } from "@/lib/client/live/routes";
import { clientMethodSchemas } from "@spoke/protocol";

const apiBase = "https://api.example.test/v1";
const healthy = {
  api: "ok",
  database: "ok",
  rpc: "ok",
  indexer: { status: "ok", lastBlock: "120", lagSeconds: 2 },
  chainHead: "121",
  chainId: 10143,
  protocolAddress: null,
};

const envelopeOf = (data: unknown, extra: Record<string, unknown> = {}) => ({
  requestId: "req-1",
  timestamp: "2026-10-12T12:00:00.000Z",
  ...extra,
  data,
});

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const jsonBody = (init: RequestInit): unknown =>
  typeof init.body === "string" ? JSON.parse(init.body) : null;

const configWith = (fetcher: typeof fetch, extra: Partial<HttpConfig> = {}): HttpConfig => ({
  apiBase,
  csrfToken: () => "csrf-1",
  fetcher,
  isOnline: () => true,
  ...extra,
});

describe("route table", () => {
  it("has a route for every client method", () => {
    expect(Object.keys(liveRoutes).sort()).toEqual(Object.keys(clientMethodSchemas).sort());
  });

  it("reads one campaign's vault from its own path", () => {
    expect(routeFor("vault.get", { campaignId: "7" }).path).toBe(
      "/merchant/campaigns/:campaignId/vault",
    );
    expect(routeFor("vault.get", {}).path).toBe("/merchant/vault");
  });
});

describe("buildRequest", () => {
  const config = { apiBase, csrfToken: () => "csrf-1" };

  it("fills path parameters and sends the rest as query on public reads with optional session cookies", () => {
    const { url, init } = buildRequest(
      liveRoutes["checkout.preview"],
      { campaignId: "7", node: "3", buyer: undefined },
      config,
    );
    expect(url).toBe(`${apiBase}/campaigns/7/checkout-preview?node=3`);
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).has("x-csrf-token")).toBe(false);
  });

  it("joins array filters with commas", () => {
    const { url } = buildRequest(
      liveRoutes["distributors.search"],
      { categories: ["design", "courses"], limit: 5 },
      config,
    );
    expect(url).toBe(`${apiBase}/distributors?categories=design%2Ccourses&limit=5`);
  });

  it("sends session writes with cookies, the CSRF token and an idempotency key", () => {
    const orderKey = `0x${"ab".repeat(32)}`;
    const { init } = buildRequest(
      liveRoutes["checkout.createIntent"],
      { campaignId: "7", orderKey },
      config,
    );
    const headers = new Headers(init.headers);
    expect(init.credentials).toBe("include");
    expect(headers.get("x-csrf-token")).toBe("csrf-1");
    expect(headers.get("idempotency-key")).toBe(orderKey);
    expect(jsonBody(init)).toEqual({ campaignId: "7", orderKey });
  });

  it("unwraps the payload field for drafts", () => {
    const { url, init } = buildRequest(
      liveRoutes["campaigns.saveDraft"],
      { id: "d1", draft: { stepReached: 2 } },
      config,
    );
    expect(url).toBe(`${apiBase}/merchant/campaign-drafts/d1`);
    expect(init.method).toBe("PUT");
    expect(jsonBody(init)).toEqual({ stepReached: 2 });
  });

  it("sends a body on deletes only when fields remain", () => {
    const withToken = buildRequest(
      liveRoutes["account.removePasskey"],
      { credentialId: "cred", confirmationToken: "t" },
      config,
    );
    expect(jsonBody(withToken.init)).toEqual({ confirmationToken: "t" });
    const bare = buildRequest(liveRoutes["campaigns.deleteDraft"], { id: "d1" }, config);
    expect(bare.init.body).toBeUndefined();
  });
});

describe("callLive", () => {
  it("returns the validated data and reports indexing status", async () => {
    const onMeta = vi.fn();
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(respond(200, envelopeOf(healthy, { indexingStatus: "syncing" }))),
    );
    const result = await callLive(configWith(fetcher, { onMeta }), "system.health", {});
    expect(result.indexer.lastBlock).toBe("120");
    expect(onMeta).toHaveBeenCalledWith(
      expect.objectContaining({ method: "system.health", indexingStatus: "syncing" }),
    );
  });

  it("maps the API error envelope to a typed error", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        respond(409, {
          error: { code: "SELF_REFERRAL", message: "no", retryable: false, requestId: "r9" },
        }),
      ),
    );
    await expect(callLive(configWith(fetcher), "system.health", {})).rejects.toMatchObject({
      code: "SELF_REFERRAL",
      requestId: "r9",
      retryable: false,
      status: 409,
    });
  });

  it("treats 429 as rate limited with the wait from Retry-After", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(respond(429, {}, { "retry-after": "12" })),
    );
    await expect(callLive(configWith(fetcher), "system.health", {})).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryAfterSeconds: 12,
    });
  });

  it("treats a 5xx without a code as the API being unreachable", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response("bad", { status: 502 })),
    );
    await expect(callLive(configWith(fetcher), "system.health", {})).rejects.toMatchObject({
      code: "API_UNREACHABLE",
    });
  });

  it("refuses a response that doesn't match the schema", async () => {
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(respond(200, envelopeOf({ api: "fine" }))),
    );
    await expect(callLive(configWith(fetcher), "system.health", {})).rejects.toMatchObject({
      code: "RESPONSE_INVALID",
    });
  });

  it("reports offline when the browser is offline", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("failed")));
    await expect(
      callLive(configWith(fetcher, { isOnline: () => false }), "system.health", {}),
    ).rejects.toMatchObject({ code: "OFFLINE" });
    await expect(callLive(configWith(fetcher), "system.health", {})).rejects.toMatchObject({
      code: "API_UNREACHABLE",
    });
  });

  it("validates input before sending anything", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      callLive(configWith(fetcher), "campaigns.updateSettings", {
        campaignId: "7",
        budgetAlertSales: 99,
      }),
    ).rejects.toBeInstanceOf(ClientError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("signals an expired session on 401", async () => {
    const onUnauthenticated = vi.fn();
    const fetcher = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        respond(401, {
          error: { code: "UNAUTHENTICATED", message: "x", retryable: false, requestId: "r" },
        }),
      ),
    );
    await expect(
      callLive(configWith(fetcher, { onUnauthenticated }), "account.me", {}),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(onUnauthenticated).toHaveBeenCalledWith("account.me");
  });
});
