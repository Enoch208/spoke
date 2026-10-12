import { afterAll, describe, expect, it } from "vitest";
import { clientRoutes, clientMethodSchemas, type ClientMethod } from "@spoke/protocol";
import { createApp } from "../src/app.js";
import { connectStore } from "../src/db/store.js";
import { createChainService } from "../src/services/chain.js";
import { equivalentPath, routeRegistry } from "../src/http/router.js";

const store = connectStore("postgres://localhost:1/unavailable");
createApp({
  webOrigin: "http://localhost:3140",
  config: { chainId: 31337, protocolAddress: null },
  probes: { rpc: () => Promise.resolve("not_configured" as const) },
  services: {
    store,
    chain: createChainService("http://localhost:1", 31337, null, null),
    webOrigin: "http://localhost:3140",
    production: false,
    operators: [],
  },
});
describe("client transport coverage", () => {
  afterAll(() => store.close());
  it("serves a registered HTTP route for every canonical client method", () => {
    const missing = Object.entries(clientRoutes)
      .filter(
        ([, route]) =>
          !routeRegistry.some(
            (entry) =>
              entry.method === route.verb && equivalentPath(entry.path, `/v1${route.path}`),
          ),
      )
      .map(([name]) => name);
    expect(missing).toEqual([]);
  });
  it("keeps all demo-only methods explicitly unavailable in live mode", () => {
    const designed = Object.entries(clientMethodSchemas)
      .filter(([, entry]) => entry.release === "demo-only")
      .map(([name]) => name as ClientMethod);
    expect(designed.length).toBeGreaterThan(0);
    for (const method of designed) expect(clientRoutes[method]).toBeDefined();
  });
});
