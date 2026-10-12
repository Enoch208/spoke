import { describe, expect, it } from "vitest";
import { createSpokeClient, SpokeApiError } from "../src/index.js";

const reply = (data: unknown) =>
  Response.json({
    requestId: "req_test",
    timestamp: new Date().toISOString(),
    schemaVersion: "3.0",
    chainId: 10143,
    contractAddress: null,
    blockNumber: null,
    indexingStatus: "syncing",
    data,
  });
describe("public read client", () => {
  it("validates input and response and sends credential-free public requests", async () => {
    let captured: { url: string; credentials: RequestCredentials | undefined } | null = null;
    const client = createSpokeClient({
      baseUrl: "https://api.usespoke.xyz",
      fetch: (url, options) => {
        captured = {
          url: url instanceof URL ? url.href : typeof url === "string" ? url : url.url,
          credentials: options?.credentials,
        };
        return Promise.resolve(reply({ contracts: [] }));
      },
    });
    expect(await client.read("system.contracts", {})).toEqual({ contracts: [] });
    expect(captured).toEqual({
      url: "https://api.usespoke.xyz/v1/system/contracts",
      credentials: "omit",
    });
    expect(await client.readEnvelope("system.contracts", {})).toMatchObject({
      chainId: 10143,
      indexingStatus: "syncing",
      data: { contracts: [] },
    });
  });
  it("retains the server request ID and typed retryability", async () => {
    const client = createSpokeClient({
      baseUrl: "https://api.usespoke.xyz",
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: "INDEXER_LAGGING",
                message: "Wait for indexing.",
                requestId: "req_real",
                retryable: true,
              },
            },
            { status: 503 },
          ),
        ),
    });
    await expect(client.read("system.contracts", {})).rejects.toMatchObject<Partial<SpokeApiError>>(
      { code: "INDEXER_LAGGING", requestId: "req_real", retryable: true, status: 503 },
    );
  });
  it("rejects malformed live success instead of returning an untyped object", async () => {
    const client = createSpokeClient({
      baseUrl: "https://api.usespoke.xyz",
      fetch: () => Promise.resolve(reply({ contracts: [{ sourceVerified: "yes" }] })),
    });
    await expect(client.read("system.contracts", {})).rejects.toThrow();
  });
});
