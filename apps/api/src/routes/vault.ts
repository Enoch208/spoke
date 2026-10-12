import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { billingSummary, vaultMovement, uintString, walletAddress } from "@spoke/protocol";
import { merchantFor, route, router } from "../http/router.js";
import { ok } from "../http/respond.js";
import { events } from "../db/schema.js";
import { allRecords, pageValues, timestamp } from "../services/read-utils.js";
import { nativeToken } from "../services/catalog.js";
import { vaultSnapshot } from "../services/vault.js";
import { eventTx } from "../services/evidence.js";
import { reportRoutes } from "./reports.js";
import type { Services } from "../types.js";

export const vaultRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  route(app, services, "GET", "/merchant/vault", "merchant", async (c) => {
    const ledger = await vaultSnapshot(
      services,
      z.string().parse((await merchantFor(c, services)).payload.address),
      c.req.query("campaignId"),
    );
    c.set("blockNumber", ledger.blockNumber);
    const matches =
      !c.req.query("token") ||
      walletAddress.parse(c.req.query("token")).toLowerCase() === chain.token?.toLowerCase();
    return ok(c, matches ? ledger : { ...ledger, campaigns: [], totals: [] });
  });
  route(app, services, "GET", "/merchant/campaigns/:id/vault", "merchant", async (c) => {
    const ledger = await vaultSnapshot(
      services,
      z.string().parse((await merchantFor(c, services)).payload.address),
      uintString.parse(c.req.param("id") ?? ""),
    );
    c.set("blockNumber", ledger.blockNumber);
    return ok(c, ledger);
  });
  route(app, services, "GET", "/merchant/vault/movements", "merchant", async (c) => {
    const merchant = await merchantFor(c, services);
    const ids = new Set(
      (
        await allRecords(
          store,
          "campaign",
          z.string().parse(merchant.payload.address).toLowerCase(),
        )
      ).map((row) => row.id),
    );
    const kindMap: Record<
      string,
      "deposited" | "reserved" | "finalized" | "refunded" | "claimed" | "withdrawn"
    > = {
      CampaignFunded: "deposited",
      NativePurchaseAccepted: "reserved",
      SaleFinalized: "finalized",
      SaleRefunded: "refunded",
      RewardClaimed: "claimed",
      MerchantProceedsClaimed: "claimed",
      SurplusReturned: "withdrawn",
    };
    const rows = (
      await store.db
        .select()
        .from(events)
        .where(and(eq(events.chainId, chain.chainId)))
    )
      .filter(
        (event) =>
          typeof event.payload.campaignId === "string" &&
          ids.has(event.payload.campaignId) &&
          kindMap[event.name] &&
          (!c.req.query("campaignId") || event.payload.campaignId === c.req.query("campaignId")) &&
          (!c.req.query("kind") || kindMap[event.name] === c.req.query("kind")),
      )
      .sort((a, b) =>
        BigInt(a.blockNumber) > BigInt(b.blockNumber)
          ? -1
          : BigInt(a.blockNumber) < BigInt(b.blockNumber)
            ? 1
            : b.logIndex - a.logIndex,
      );
    const page = pageValues(c, rows, (row) => row.id);
    return ok(c, {
      ...page,
      items: page.items.map((event) =>
        vaultMovement.parse({
          tx: eventTx(chain.chainId, event),
          amount:
            event.payload.receivedAmount ??
            event.payload.amount ??
            event.payload.rewardReserved ??
            event.payload.commissionAmount ??
            event.payload.releasedReward ??
            "0",
          token: nativeToken(chain.token),
          campaignId: event.payload.campaignId,
          source: event.name === "MerchantProceedsClaimed" ? "SALE_PROCEEDS" : "REWARD",
          at: event.at.toISOString(),
          kind: kindMap[event.name],
          saleId: event.payload.saleId ?? null,
        }),
      ),
    });
  });
  route(app, services, "GET", "/merchant/billing", "merchant", async (c) => {
    const merchant = await merchantFor(c, services);
    const campaigns = await allRecords(
      store,
      "campaign",
      z.string().parse(merchant.payload.address).toLowerCase(),
    );
    const ids = new Set(campaigns.map((row) => row.id));
    const rows = (await allRecords(store, "receipt")).filter(
      (row) => ids.has(z.string().parse(row.payload.campaignId)) && row.payload.status === 3,
    );
    const dates = rows.map((row) => timestamp(row.payload.purchasedAt)).sort();
    const now = new Date().toISOString();
    return ok(
      c,
      billingSummary.parse({
        feeBps: 0,
        period: { from: dates[0] ?? now, to: now },
        totals: chain.token
          ? [
              {
                token: nativeToken(chain.token),
                settledValue: rows
                  .reduce((sum, row) => sum + BigInt(z.string().parse(row.payload.price)), 0n)
                  .toString(),
                protocolFees: "0",
              },
            ]
          : [],
      }),
    );
  });
  route(app, services, "GET", "/merchant/billing/invoices", "merchant", (c) =>
    ok(c, { items: [], nextCursor: null }),
  );
  app.route("/", reportRoutes(services));
  return app;
};
