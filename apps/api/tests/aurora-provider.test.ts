import { describe, expect, it } from "vitest";
import { createAuroraCatalog } from "../src/services/aurora-catalog.js";
import { createAuroraProvider, monadUsdc } from "../src/services/aurora-provider.js";

const monad = {
  assetId: "nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx",
  blockchain: "monad",
  symbol: "USDC",
  decimals: 6,
  contractAddress: monadUsdc.toLowerCase(),
};
const base = {
  assetId: "nep141:base.omft.near",
  blockchain: "base",
  symbol: "ETH",
  decimals: 18,
};
const provider = (body: unknown) =>
  createAuroraProvider("test-public-app-key", () => Promise.resolve(Response.json(body)));

describe("Aurora token catalog wire format", () => {
  it("reads the token envelope and normalizes native assets without contract addresses", async () => {
    const config = await createAuroraCatalog(
      provider({
        asset_stats: [{ token_id: base.assetId, volume_amount_usd: "100" }],
        tokens: [
          { ...base, price: 2515.25, priceUpdatedAt: "2026-10-13T15:36:30.651Z" },
          monad,
          { assetId: "nep141:wrap.near", blockchain: "near", symbol: "wNEAR", decimals: 24 },
        ],
      }),
    )();
    expect(config.configured).toBe(true);
    expect(config.sources).toEqual([
      { ...base, contractAddress: null, chainId: 8453, networkName: "Base" },
    ]);
    expect(config.destinations).toEqual([{ ...monad, chainId: 143, networkName: "Monad Mainnet" }]);
    expect(config).not.toHaveProperty("asset_stats");
  });

  it("preserves token addresses and normalizes explicit null native addresses", async () => {
    const result = await provider({ tokens: [{ ...base, contractAddress: null }, monad] }).tokens();
    expect(result).toEqual([{ ...base, contractAddress: null }, monad]);
  });

  it.each([
    { body: [base, monad] },
    { body: { asset_stats: [] } },
    { body: { tokens: null } },
    { body: { tokens: [{ ...base, decimals: "18" }, monad] } },
    { body: { tokens: [{ ...base, contractAddress: 123 }, monad] } },
  ])("rejects malformed catalogs without exposing provider payloads", async ({ body }) => {
    await expect(provider(body).tokens()).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      message: "Aurora returned an unexpected response. Try again shortly.",
    });
  });

  it("rejects a non-EVM contract address on a supported EVM network", async () => {
    await expect(
      createAuroraCatalog(
        provider({ tokens: [{ ...base, contractAddress: "wrap.near" }, monad] }),
      )(),
    ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });

  it("requires exactly one canonical Monad USDC destination", async () => {
    await expect(
      createAuroraCatalog(provider({ tokens: [base, { ...monad, contractAddress: null }] }))(),
    ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    await expect(
      createAuroraCatalog(provider({ tokens: [base, monad, monad] }))(),
    ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });
});
