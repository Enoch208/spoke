import { z } from "zod";
import {
  campaignEarnings,
  claimable,
  conversionEarning,
  earningsSummary,
  claimRow,
  walletAddress,
} from "@spoke/protocol";
import { accountId, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { allRecords, pageValues, zeroBuckets } from "../services/read-utils.js";
import { earnedSnapshot, filterEarnings } from "../services/earnings.js";
import { campaignCard } from "../services/views.js";
import { nativeToken } from "../services/catalog.js";
import { reputationRoutes } from "./reputation.js";
import { vaultRoutes } from "./vault.js";
import { missedRoutes } from "./missed.js";
import { partnerRoutes } from "./partners.js";
import { analyticsRoutes } from "./analytics.js";
import type { ApiContext, Services } from "../types.js";

export const earningsRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  const tokenMatches = (c: ApiContext) =>
    !c.req.query("token") ||
    walletAddress.parse(c.req.query("token")).toLowerCase() === chain.token?.toLowerCase();
  const earned = async (c: ApiContext) => {
    const wallets = (await allRecords(store, "wallet", accountId(c))).map((row) => row.id);
    const result = await earnedSnapshot(services, wallets);
    c.set("blockNumber", result.blockNumber);
    return result;
  };
  route(app, services, "GET", "/me/earnings", "session", async (c) => {
    const result = await earned(c);
    const matches = tokenMatches(c);
    const future = result.rows
      .filter((row) => row.bucket === "atRisk")
      .map((row) => row.unlockAt)
      .sort();
    return ok(
      c,
      earningsSummary.parse({
        tokens: matches && result.token ? [{ ...result.buckets, token: result.token }] : [],
        nextUnlockAt: matches ? (future[0] ?? null) : null,
        indexedBlock: result.indexedBlock,
        blockNumber: result.blockNumber,
      }),
    );
  });
  route(app, services, "GET", "/me/earnings/conversions", "session", async (c) => {
    const result = await earned(c);
    const rows = filterEarnings(result.rows, c.req.query());
    const page = pageValues(c, rows, (row) => `${row.saleId}_${String(row.level)}`);
    return ok(c, { ...page, items: page.items.map((row) => conversionEarning.parse(row)) });
  });
  route(app, services, "GET", "/me/earnings/campaigns", "session", async (c) => {
    const result = await earned(c);
    const selected = filterEarnings(result.rows, c.req.query());
    const ids = [...new Set(selected.map((row) => row.campaignId))];
    return ok(
      c,
      await Promise.all(
        ids.map(async (id) => {
          const rows = selected.filter((row) => row.campaignId === id);
          const buckets = zeroBuckets();
          for (const row of rows)
            buckets[row.bucket] = (BigInt(buckets[row.bucket]) + BigInt(row.amount)).toString();
          const card = await campaignCard(store, await store.require("campaign", id));
          return campaignEarnings.parse({
            ...buckets,
            campaignId: id,
            token: result.token,
            productTitle: card.product.title,
            sales: {
              pending: new Set(
                rows.filter((row) => row.state === "reserved").map((row) => row.saleId),
              ).size,
              finalized: new Set(
                rows
                  .filter((row) => row.state === "claimed" || row.state === "claimable")
                  .map((row) => row.saleId),
              ).size,
              refunded: new Set(
                rows.filter((row) => row.state === "refunded").map((row) => row.saleId),
              ).size,
            },
          });
        }),
      ),
    );
  });
  route(app, services, "GET", "/me/claimable", "session", async (c) => {
    const result = await earned(c);
    const matches = tokenMatches(c);
    const ids = [...new Set(result.breakdown.map((row) => row.campaignId))];
    const campaigns = ids.map((id) => ({
      campaignId: id,
      amount: result.breakdown
        .filter((row) => row.campaignId === id)
        .reduce((sum, row) => sum + BigInt(row.amount), 0n)
        .toString(),
    }));
    return ok(
      c,
      claimable.parse({
        tokens:
          matches && result.token
            ? [{ token: result.token, amount: result.buckets.claimable, campaigns }]
            : [],
        blockNumber: result.blockNumber,
        readyToFinalize: matches
          ? result.rows.filter((row) => row.bucket === "readyToFinalize")
          : [],
      }),
    );
  });
  route(app, services, "GET", "/me/claims", "session", async (c) => {
    const wallets = (await allRecords(store, "wallet", accountId(c))).map((row) => row.id);
    const rows = (await allRecords(store, "claim"))
      .filter((row) => wallets.includes(row.owner))
      .sort((a, b) =>
        BigInt(z.string().parse(a.payload.blockNumber)) >
        BigInt(z.string().parse(b.payload.blockNumber))
          ? -1
          : 1,
      );
    const page = pageValues(c, rows, (row) => row.id);
    return ok(c, {
      ...page,
      items: page.items.map((row) =>
        claimRow.parse({
          ...row.payload,
          token: nativeToken(chain.token),
          tx: {
            hash: row.payload.txHash,
            blockNumber: row.payload.blockNumber,
            at: row.payload.at,
            explorerUrl:
              chain.chainId === 10143
                ? `https://testnet.monadvision.com/tx/${z.string().parse(row.payload.txHash)}`
                : null,
          },
        }),
      ),
    });
  });
  app.route("/", reputationRoutes(services));
  app.route("/", vaultRoutes(services));
  app.route("/", missedRoutes(services));
  app.route("/", partnerRoutes(services));
  app.route("/", analyticsRoutes(services));
  return app;
};
