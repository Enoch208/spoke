import { and, eq } from "drizzle-orm";
import { TransactionNotFoundError } from "viem";
import { z } from "zod";
import { checkoutInputV3, resourceId, walletAddress, txHashString } from "@spoke/protocol";
import { idempotency } from "../db/schema.js";
import { digest } from "../db/store.js";
import { intentView } from "../services/intents.js";
import { accountId, input, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import { linkRoutes } from "./links.js";
import type { Services } from "../types.js";

export const checkoutRoutes = (services: Services) => {
  const app = router();
  const { chain, store } = services;
  route(app, services, "POST", "/checkout/intents", "session", async (c) => {
    const body = await input(c, checkoutInputV3);
    const key = z
      .string()
      .min(8)
      .max(128)
      .regex(/^[\w-]+$/)
      .parse(c.req.header("idempotency-key"));
    if (body.chainId !== chain.chainId)
      throw new ApiProblem(400, "WRONG_NETWORK", "Wrong checkout chain.");
    const buyer = walletAddress.parse(c.get("session").address);
    const payload = {
      ...body,
      buyer,
      to: chain.address,
      data: chain.checkoutData(body.campaignId, body.nodeId, body.orderKey as `0x${string}`),
      value: "0",
      authority: "user_signed_transaction",
    };
    const [existing] = await store.db
      .select()
      .from(idempotency)
      .where(and(eq(idempotency.owner, accountId(c)), eq(idempotency.key, key)))
      .limit(1);
    if (existing) {
      if (existing.fingerprint !== digest(JSON.stringify(payload)))
        throw new ApiProblem(
          409,
          "CONFLICT",
          "Idempotency key was already used with another request.",
        );
      return ok(
        c,
        await intentView(services, await store.require("intent", existing.recordId, accountId(c))),
      );
    }
    await chain.ready();
    const preview = await chain.preview(body.campaignId, body.nodeId, buyer);
    if (
      preview.policyHash.toLowerCase() !== body.policyHash.toLowerCase() ||
      preview.price !== body.expectedPrice ||
      preview.rewardTotal !== body.expectedReward
    )
      throw new ApiProblem(
        409,
        "POLICY_MISMATCH",
        "Price or reward changed. Refresh the checkout.",
      );
    return ok(c, await store.createIntent(accountId(c), key, payload), 201);
  });
  route(app, services, "GET", "/checkout/intents/:id", "session", async (c) => {
    const row = await store.require(
      "intent",
      resourceId.parse(c.req.param("id") ?? ""),
      accountId(c),
    );
    return ok(c, await intentView(services, row));
  });
  route(app, services, "POST", "/checkout/intents/:id/transaction", "session", async (c) => {
    const body = await input(c, z.strictObject({ txHash: txHashString }));
    const row = await store.require(
      "intent",
      resourceId.parse(c.req.param("id") ?? ""),
      accountId(c),
    );
    const tx = await chain.client
      .getTransaction({ hash: body.txHash as `0x${string}` })
      .catch((error: unknown) => {
        if (error instanceof TransactionNotFoundError)
          throw new ApiProblem(
            409,
            "TX_PENDING",
            "The transaction is not visible to the RPC yet. Retry shortly.",
            true,
          );
        throw error;
      });
    if (
      tx.from.toLowerCase() !== c.get("session").address.toLowerCase() ||
      tx.to?.toLowerCase() !== chain.address?.toLowerCase() ||
      tx.input !== row.payload.data ||
      tx.value !== 0n
    )
      throw new ApiProblem(
        409,
        "CONFLICT",
        "Transaction does not match this buyer and checkout intent.",
      );
    const saved = await store.revise("intent", row.id, row.owner, (previous) => {
      if (previous?.payload.txHash && previous.payload.txHash !== body.txHash)
        throw new ApiProblem(409, "CONFLICT", "A different transaction is already attached.");
      return { ...previous?.payload, txHash: body.txHash, status: "submitted" };
    });
    return ok(c, saved.payload);
  });
  app.route("/", linkRoutes(services));
  return app;
};
