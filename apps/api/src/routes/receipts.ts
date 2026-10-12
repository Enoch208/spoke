import { z } from "zod";
import { spokeProtocolAbi, uintString } from "@spoke/protocol";
import { accountId, merchantFor, route, router } from "../http/router.js";
import { newId } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { allocations, ancestry } from "../services/views.js";
import { wire } from "../services/chain.js";
import { allRecords, counts, pageValues, relatedRecords } from "../services/read-utils.js";
import { purchaseView, filteredSales } from "../services/sales.js";
import { receiptView, receiptEvidence, eventTx } from "../services/evidence.js";
import { proofView } from "../services/proof.js";
import { graphNodeView, pathView } from "../services/graph.js";
import { disputeRoutes } from "./disputes.js";
import { viewerSession } from "../services/viewer.js";
import type { ApiContext, Services } from "../types.js";

export const receiptRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  const assertChain = (c: ApiContext) => {
    if (
      z.coerce
        .number()
        .int()
        .parse(c.req.param("chainId") ?? "") !== chain.chainId
    )
      throw new ApiProblem(400, "WRONG_NETWORK", "Receipt belongs to another chain.");
  };
  const receipt = async (c: ApiContext) => {
    assertChain(c);
    return store.require("receipt", uintString.parse(c.req.param("id") ?? ""));
  };
  route(app, services, "GET", "/receipts/:chainId/:id", "public", async (c) => {
    const row = await receipt(c);
    const viewer = await viewerSession(c, services);
    const buyer = await store.identity("wallet", row.owner.toLowerCase());
    return ok(c, await receiptView(services, row, viewer !== null && viewer.accountId === buyer));
  });
  route(app, services, "GET", "/receipts/:chainId/:id/allocations", "public", async (c) =>
    ok(c, (await receiptView(services, await receipt(c))).allocations),
  );
  route(app, services, "GET", "/receipts/:chainId/:id/verify", "public", async (c) => {
    assertChain(c);
    const id = uintString.parse(c.req.param("id") ?? "");
    const head = await chain.head();
    const [sale, split] = await chain.sale(id, BigInt(head.blockNumber));
    const row = await store.get("receipt", id);
    const indexedAllocations = row ? allocations.parse(row.payload.allocations) : [];
    const match = row
      ? row.payload.status === sale.status &&
        indexedAllocations.length === split.length &&
        indexedAllocations.every((allocation, index) => {
          const canonical = split[index];
          return (
            canonical !== undefined &&
            allocation.recipient.toLowerCase() === canonical.recipient.toLowerCase() &&
            allocation.amount === canonical.amount.toString() &&
            allocation.depth === canonical.depth &&
            allocation.effectiveWeightBps === canonical.effectiveWeightBps
          );
        })
      : false;
    if (!match)
      await store.put("reconciliation", newId(), "system", {
        saleId: id,
        matches: false,
        blockNumber: head.blockNumber,
        at: new Date().toISOString(),
      });
    if (!row)
      throw new ApiProblem(
        503,
        "INDEXER_LAGGING",
        "Purchase evidence has not been indexed yet.",
        true,
      );
    const contract = await chain.ready();
    const allocationClaims = await Promise.all(
      split.map((allocation) =>
        chain.client.readContract({
          address: contract,
          abi: spokeProtocolAbi,
          functionName: "allocationClaimed",
          args: [BigInt(id), allocation.recipient],
          blockNumber: BigInt(head.blockNumber),
        }),
      ),
    );
    const canonical = await receiptView(services, {
      ...row,
      payload: {
        ...row.payload,
        ...z.record(z.string(), z.unknown()).parse(wire(sale)),
        allocations: wire(split),
        allocationClaims,
        indexedBlock: head.blockNumber,
      },
    });
    c.set("blockNumber", head.blockNumber);
    return ok(c, {
      sale: canonical,
      allocations: canonical.allocations,
      matchesIndex: match,
      blockNumber: head.blockNumber,
      policyHash: sale.policyHash,
    });
  });
  route(app, services, "GET", "/receipts/:chainId/:id/events", "public", async (c) =>
    ok(
      c,
      await Promise.all(
        (await receiptEvidence(store, chain.chainId, (await receipt(c)).id)).map((event) =>
          proofView(store, chain.chainId, event),
        ),
      ),
    ),
  );
  route(app, services, "GET", "/receipts/:chainId/:id/path", "public", async (c) => {
    const row = await receipt(c);
    const canonical = await receiptView(services, row);
    const path = await pathView(
      store,
      z.string().parse(row.payload.nodeId),
      allocations.parse(row.payload.allocations),
      canonical.allocations.map((item) => item.state),
    );
    return ok(c, {
      saleId: row.id,
      ...path,
      policyHash: row.payload.policyHash,
      evidence: (await receiptEvidence(store, chain.chainId, row.id)).map((event) =>
        eventTx(chain.chainId, event),
      ),
    });
  });
  route(app, services, "GET", "/nodes/:chainId/:id/ancestry", "public", async (c) => {
    assertChain(c);
    const path = await ancestry(store, uintString.parse(c.req.param("id") ?? ""));
    return ok(c, {
      nodes: await Promise.all(path.rows.map((row) => graphNodeView(store, row))),
      truncated: path.truncated,
    });
  });
  route(app, services, "GET", "/receipts", "public", async (c) => {
    const page = pageValues(c, await filteredSales(services, c), (row) => row.id);
    return ok(c, {
      ...page,
      items: await Promise.all(page.items.map((row) => receiptView(services, row))),
    });
  });
  route(app, services, "GET", "/campaigns/:id/sales", "public", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    await store.require("campaign", id);
    const page = pageValues(
      c,
      await filteredSales(services, c, await relatedRecords(store, "receipt", "campaignId", id)),
      (row) => row.id,
    );
    const items = await Promise.all(
      page.items.map(async (row) => {
        const value = { ...(await purchaseView(services, row, true)), refundRequestStatus: null };
        return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "orderKey"));
      }),
    );
    return ok(c, { ...page, items });
  });
  route(app, services, "GET", "/me/purchases", "session", async (c) => {
    const wallets = new Set((await allRecords(store, "wallet", accountId(c))).map((row) => row.id));
    const rows = (await allRecords(store, "receipt")).filter((row) => wallets.has(row.owner));
    const page = pageValues(c, await filteredSales(services, c, rows), (row) => row.id);
    return ok(c, {
      ...page,
      items: await Promise.all(page.items.map((row) => purchaseView(services, row))),
    });
  });
  route(app, services, "GET", "/merchant/sales", "merchant", async (c) => {
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
    const rows = await filteredSales(
      services,
      c,
      (await allRecords(store, "receipt")).filter((row) =>
        ids.has(z.string().parse(row.payload.campaignId)),
      ),
    );
    const page = pageValues(c, rows, (row) => row.id);
    return ok(c, {
      ...page,
      items: await Promise.all(page.items.map((row) => purchaseView(services, row, true))),
      countsByState: counts(rows),
    });
  });
  app.route("/", disputeRoutes(services));
  return app;
};
