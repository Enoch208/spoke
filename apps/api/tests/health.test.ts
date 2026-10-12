import { apiError, envelope, health } from "@spoke/protocol";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const appWith = (rpc: "ok" | "down") =>
  createApp({
    webOrigin: "http://localhost:3040",
    probes: { rpc: () => Promise.resolve(rpc) },
    config: { chainId: 31337, protocolAddress: null },
  });

describe("GET /v1/health", () => {
  it("reports each subsystem separately inside the envelope", async () => {
    const response = await appWith("ok").request("/v1/health");
    expect(response.status).toBe(200);
    const body = envelope(health).parse(await response.json());
    expect(body.requestId).toMatch(/^req_/);
    expect(body.data).toMatchObject({ api: "ok", rpc: "ok", database: "not_configured" });
  });

  it("never reports a down RPC as healthy", async () => {
    const body = envelope(health).parse(await (await appWith("down").request("/v1/health")).json());
    expect(body.data.rpc).toBe("down");
  });
  it("keeps health diagnostics available when configured probes fail", async () => {
    const unavailable = () => Promise.reject(new Error("Unavailable subsystem"));
    const app = createApp({
      webOrigin: "http://localhost:3040",
      probes: {
        rpc: unavailable,
        database: unavailable,
        indexer: unavailable,
        chainHead: unavailable,
        indexed: unavailable,
      },
      config: { chainId: 31337, protocolAddress: null },
    });
    const response = await app.request("/v1/health");
    expect(response.status).toBe(200);
    const body = envelope(health).parse(await response.json());
    expect(body.data).toMatchObject({
      api: "ok",
      database: "down",
      rpc: "down",
      indexer: { status: "down", lastBlock: null, lagSeconds: null },
      chainHead: null,
    });
  });
});

describe("unknown routes", () => {
  it("answer with the typed error envelope", async () => {
    const response = await appWith("ok").request("/v1/nope");
    expect(response.status).toBe(404);
    expect(apiError.parse(await response.json()).error.code).toBe("NOT_FOUND");
  });
});
