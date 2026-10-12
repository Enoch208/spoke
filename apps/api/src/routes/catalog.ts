import { policyView } from "../services/chain.js";
import { draftView, merchantView, productView } from "../services/catalog.js";
import { z } from "zod";
import { keccak256, toBytes } from "viem";
import {
  campaignDraftInput,
  commissionPolicy,
  handle,
  hashPolicy,
  merchantInput,
  merchantUpdate,
  productInput,
  resourceId,
  simulatePolicy,
  uintString,
  preparedCampaign,
  protocolLimits,
  policyTemplate,
  spokeProtocolAbi,
  clientMethodSchemas,
} from "@spoke/protocol";
import { newId, present } from "../db/store.js";
import { accountId, input, merchantFor, route, router, stepUp } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import type { Services } from "../types.js";
import { allRecords, pageValues } from "../services/read-utils.js";
import { assetView } from "../services/assets.js";
import { merchantRecordView } from "../services/merchant-record.js";
import { viewerSession } from "../services/viewer.js";
import { reservedHandles } from "./account.js";

export const categories = [
  { id: "digital", name: "Digital products" },
  { id: "education", name: "Education" },
  { id: "software", name: "Software" },
  { id: "design", name: "Design" },
  { id: "other", name: "Other" },
];
export const catalogRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  route(app, services, "GET", "/categories", "public", (c) => ok(c, categories));
  route(app, services, "GET", "/merchant", "merchant", async (c) =>
    ok(c, await merchantView(store, await merchantFor(c, services), true)),
  );
  route(app, services, "POST", "/merchant", "session", async (c) => {
    const body = await input(c, merchantInput);
    if (await store.get("merchant", accountId(c)))
      throw new ApiProblem(409, "CONFLICT", "This account already has a merchant workspace.");
    if (reservedHandles.has(body.slug))
      throw new ApiProblem(409, "SLUG_TAKEN", "Choose another merchant slug.");
    await store.reserve("slug", body.slug, accountId(c));
    const row = await store.put("merchant", accountId(c), accountId(c), {
      ...body,
      address: c.get("session").address,
      verificationTier: "unverified",
      agreement: { version: "1.0", acceptedAt: new Date().toISOString() },
      closedAt: null,
    });
    await store.audit(accountId(c), "merchant-created", row.id);
    return ok(c, await merchantView(store, row, true), 201);
  });
  route(app, services, "PATCH", "/merchant", "merchant", async (c) => {
    const body = await input(c, merchantUpdate);
    const row = await merchantFor(c, services);
    if (body.slug && body.slug !== row.payload.slug) {
      if (reservedHandles.has(body.slug))
        throw new ApiProblem(409, "SLUG_TAKEN", "Choose another merchant slug.");
      await store.reserve("slug", body.slug, row.id);
    }
    return ok(
      c,
      await merchantView(
        store,
        await store.put("merchant", row.id, row.owner, { ...row.payload, ...body }),
        true,
      ),
    );
  });
  route(app, services, "GET", "/merchant-slugs/:slug", "session", async (c) => {
    const result = handle.safeParse(c.req.param("slug") ?? "");
    const reason = !result.success
      ? "invalid"
      : reservedHandles.has(result.data)
        ? "reserved"
        : (await store.identity("slug", result.data))
          ? "taken"
          : null;
    return ok(c, { available: reason === null, reason, suggestion: null });
  });
  route(app, services, "GET", "/merchants/:slug", "public", async (c) => {
    const owner = await store.identity("slug", c.req.param("slug") ?? "");
    const row = owner ? await store.get("merchant", owner) : undefined;
    if (!row) throw new ApiProblem(404, "NOT_FOUND", "No such merchant.");
    return ok(c, await merchantView(store, row));
  });
  route(app, services, "GET", "/merchant/products", "merchant", async (c) => {
    const billing = z.enum(["oneTime", "subscription"]).optional().parse(c.req.query("billing"));
    const rows = (await allRecords(store, "product", (await merchantFor(c, services)).id)).filter(
      (row) => billing !== "subscription" || row.payload.billingPeriod != null,
    );
    const page = pageValues(c, rows, (row) => row.id);
    return ok(c, { ...page, items: page.items.map((row) => productView(row, true)) });
  });
  route(app, services, "GET", "/products/:id", "public", async (c) => {
    const row = await store.require("product", resourceId.parse(c.req.param("id") ?? ""));
    const viewer = await viewerSession(c, services);
    return ok(c, productView(row, viewer !== null && viewer.accountId === row.owner));
  });
  route(app, services, "PUT", "/merchant/products/:id", "merchant", async (c) => {
    const id = resourceId.parse(c.req.param("id") ?? "");
    const merchant = await merchantFor(c, services);
    const body = await input(c, productInput);
    if (!chain.token || body.token.toLowerCase() !== chain.token.toLowerCase())
      throw new ApiProblem(409, "TOKEN_NOT_ALLOWED", "Only the configured demo token can be used.");
    const ownedAssets = await allRecords(store, "asset", merchant.id);
    const media = body.images.map((url) => {
      const row = ownedAssets.find(
        (asset) =>
          asset.payload.kind === "image" &&
          asset.payload.url === url &&
          asset.payload.productId === id,
      );
      if (!row)
        throw new ApiProblem(
          400,
          "VALIDATION_FAILED",
          "Use uploaded media assets belonging to this product.",
        );
      return assetView(row);
    });
    if (
      body.fulfillmentMode === "download" &&
      !ownedAssets.some(
        (asset) =>
          asset.id === body.deliverable &&
          asset.payload.kind === "download" &&
          asset.payload.productId === id,
      )
    )
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "Choose an uploaded download belonging to this product.",
      );
    if (body.fulfillmentMode === "external")
      z.url()
        .refine((value) => new URL(value).protocol === "https:")
        .parse(body.deliverable);
    const row = await store.revise(
      "product",
      id,
      merchant.id,
      (previous) => {
        const version = previous ? z.number().int().parse(previous.payload.version) + 1 : 1;
        return {
          ...body,
          media,
          merchantId: merchant.id,
          version,
          skuHash: keccak256(
            toBytes(
              JSON.stringify({
                id,
                version,
                title: body.title,
                priceBaseUnits: body.priceBaseUnits,
                token: body.token,
                fulfillmentMode: body.fulfillmentMode,
                deliverableHash: keccak256(toBytes(body.deliverable)),
              }),
            ),
          ),
        };
      },
      "product-version",
    );
    return ok(c, productView(row, true), row.payload.version === 1 ? 201 : 200);
  });
  const saveDraft = async (id: string, owner: string, body: z.infer<typeof campaignDraftInput>) => {
    if (!chain.token || body.policy.rewardToken.toLowerCase() !== chain.token.toLowerCase())
      throw new ApiProblem(409, "TOKEN_NOT_ALLOWED", "Policy must use the configured demo token.");
    let productId = body.productId;
    if (body.mode === "newVersion") {
      const campaignId = uintString.parse(body.campaignId);
      const merchant = await store.require("merchant", owner);
      const fresh = await chain.campaign(campaignId);
      if (
        fresh.campaign.merchant.toLowerCase() !==
        z.string().parse(merchant.payload.address).toLowerCase()
      )
        throw new ApiProblem(404, "NOT_FOUND", "No such campaign.");
      const metadata = await store.require("campaign-metadata", campaignId, owner);
      productId = z.string().parse(metadata.payload.productId);
    }
    const product = await store.require("product", resourceId.parse(productId), owner);
    if (body.productVersion !== undefined && product.payload.version !== body.productVersion)
      throw new ApiProblem(
        409,
        "PRODUCT_VERSION_MISMATCH",
        "Product changed. Review its latest version.",
      );
    return store.revise("draft", id, owner, (previous) => {
      if (previous?.payload.launchTxHash)
        throw new ApiProblem(409, "CONFLICT", "A launched draft cannot be edited.");
      if ((previous?.payload.version ?? 0) !== body.version)
        throw new ApiProblem(409, "CONFLICT", "Draft was changed in another session. Reload it.");
      return {
        ...body,
        productId,
        merchantId: owner,
        version: body.version + 1,
        productVersion: product.payload.version,
        productSkuHash: product.payload.skuHash,
        policyHash: hashPolicy(body.policy),
      };
    });
  };
  route(app, services, "PUT", "/merchant/campaign-drafts/:id", "merchant", async (c) =>
    ok(
      c,
      draftView(
        await saveDraft(
          resourceId.parse(c.req.param("id") ?? ""),
          (await merchantFor(c, services)).id,
          await input(c, campaignDraftInput),
        ),
      ),
    ),
  );
  route(app, services, "POST", "/campaigns/draft", "merchant", async (c) =>
    ok(
      c,
      draftView(
        await saveDraft(
          newId(),
          (await merchantFor(c, services)).id,
          await input(c, campaignDraftInput),
        ),
      ),
      201,
    ),
  );
  route(app, services, "GET", "/merchant/campaign-drafts/:id", "merchant", async (c) =>
    ok(
      c,
      draftView(
        await store.require(
          "draft",
          resourceId.parse(c.req.param("id") ?? ""),
          (await merchantFor(c, services)).id,
        ),
      ),
    ),
  );
  route(app, services, "DELETE", "/merchant/campaign-drafts/:id", "merchant", async (c) => {
    const row = await store.require(
      "draft",
      c.req.param("id") ?? "",
      (await merchantFor(c, services)).id,
    );
    if (row.payload.launchTxHash)
      throw new ApiProblem(409, "CONFLICT", "Draft launch has already started.");
    await store.remove("draft", row.id, row.owner);
    return ok(c, { deleted: true });
  });
  route(app, services, "POST", "/merchant/campaign-drafts/:id/prepare", "merchant", async (c) => {
    await input(c, z.strictObject({}));
    const draft = await store.require(
      "draft",
      c.req.param("id") ?? "",
      (await merchantFor(c, services)).id,
    );
    const body = campaignDraftInput.parse(
      Object.fromEntries(
        Object.entries(draft.payload).filter(([key]) =>
          [
            "productId",
            "productVersion",
            "policy",
            "endsAt",
            "inviteOnly",
            "stepReached",
            "version",
            "mode",
            "campaignId",
            "effectiveAt",
          ].includes(key),
        ),
      ),
    );
    await chain.ready();
    const head = await chain.client.getBlock();
    const expiry = BigInt(body.policy.expiry);
    if (expiry !== BigInt(Math.floor(Date.parse(body.endsAt) / 1000)) || expiry <= head.timestamp)
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "Policy expiry must match the campaign end date and be in the future.",
      );
    const product = await store.require(
      "product",
      resourceId.parse(draft.payload.productId),
      draft.owner,
    );
    if (product.payload.version !== draft.payload.productVersion)
      throw new ApiProblem(
        409,
        "PRODUCT_VERSION_MISMATCH",
        "Product changed. Save the draft again before launch.",
      );
    if (body.inviteOnly)
      throw new ApiProblem(
        409,
        "FEATURE_NOT_AVAILABLE",
        "Invitation-only enforcement is not deployed.",
      );
    const metadata = {
      draftId: draft.id,
      merchantId: draft.owner,
      productId: product.id,
      productVersion: product.payload.version,
      skuHash: product.payload.skuHash,
      refundPolicy: product.payload.refundPolicy,
    };
    const common = {
      metadataHash: keccak256(toBytes(JSON.stringify(metadata))),
      policy: body.policy,
      policyHash: hashPolicy(body.policy),
      eligibilityHash: body.policy.eligibilityHash,
      productVersion: product.payload.version,
      gasEstimate: null,
      cohortEnforcement: "offchain",
      mode: body.mode,
    };
    await store.put("campaign-metadata-commitment", common.metadataHash, draft.owner, metadata);
    if (body.mode === "newVersion") {
      const id = uintString.parse(body.campaignId);
      const fresh = await chain.campaign(id, head.number);
      const effectiveAt = BigInt(Math.floor(Date.parse(z.string().parse(body.effectiveAt)) / 1000));
      const earliest = head.timestamp + BigInt(protocolLimits.minimumPolicyNoticeSeconds);
      if (fresh.scheduledPolicy.version !== 0)
        throw new ApiProblem(
          409,
          "VALIDATION_FAILED",
          "New terms are already scheduled for this campaign.",
          false,
          { contractError: "PolicyVersionPending" },
        );
      if (
        effectiveAt < earliest ||
        effectiveAt >= fresh.currentPolicy.policy.expiry ||
        expiry <= effectiveAt
      )
        throw new ApiProblem(
          400,
          "VALIDATION_FAILED",
          "New terms require at least 24 hours' notice before the current terms expire.",
        );
      if (
        body.policy.rewardToken.toLowerCase() !==
        fresh.currentPolicy.policy.rewardToken.toLowerCase()
      )
        throw new ApiProblem(409, "TOKEN_NOT_ALLOWED", "The campaign reward token cannot change.");
      if (expiry > fresh.campaign.createdAt + BigInt(protocolLimits.maxCampaignDurationSeconds))
        throw new ApiProblem(400, "VALIDATION_FAILED", "Campaign duration cannot exceed 365 days.");
      const current = policyView(fresh.currentPolicy);
      const diff = Object.entries(body.policy)
        .filter(
          ([field, value]) =>
            JSON.stringify(current[field as keyof typeof current]) !== JSON.stringify(value),
        )
        .map(([field, after]) => ({
          field,
          before: current[field as keyof typeof current],
          after,
        }));
      return ok(
        c,
        preparedCampaign.parse({
          ...common,
          metadataHash: fresh.campaign.metadataHash,
          expectedEvents: ["PolicyVersionRegistered"],
          earliestEffectiveAt: new Date(Number(earliest) * 1000).toISOString(),
          diff,
        }),
      );
    }
    if (expiry > head.timestamp + BigInt(protocolLimits.maxCampaignDurationSeconds))
      throw new ApiProblem(400, "VALIDATION_FAILED", "Campaign duration cannot exceed 365 days.");
    return ok(
      c,
      preparedCampaign.parse({
        ...common,
        expectedEvents: ["CampaignCreated"],
        config: { skuHash: product.payload.skuHash, skuPrice: product.payload.priceBaseUnits },
      }),
    );
  });
  route(app, services, "GET", "/merchant/policy-templates", "merchant", async (c) =>
    ok(
      c,
      (await allRecords(store, "policy-template", (await merchantFor(c, services)).id)).map((row) =>
        policyTemplate.parse(present(row)),
      ),
    ),
  );
  route(app, services, "POST", "/merchant/policy-templates", "merchant", async (c) => {
    const body = await input(
      c,
      z.strictObject({ name: z.string().min(2).max(100), policy: commissionPolicy }),
    );
    return ok(
      c,
      policyTemplate.parse(
        present(
          await store.put("policy-template", newId(), (await merchantFor(c, services)).id, {
            ...body,
            status: "active",
          }),
        ),
      ),
      201,
    );
  });
  route(app, services, "POST", "/policies/simulate", "public", async (c) => {
    const body = await input(
      c,
      z.strictObject({
        price: uintString,
        policy: commissionPolicy,
        pathLengths: z.array(z.number().int().min(0).max(256)).min(1).max(20),
      }),
    );
    return ok(c, {
      policyHash: hashPolicy(body.policy),
      simulations: body.pathLengths.map((length) => {
        const result = simulatePolicy(BigInt(body.price), body.policy, length);
        return {
          pathLength: length,
          amounts: result.amounts.map(String),
          weightsBps: result.weightsBps,
          reserved: result.reserved.toString(),
          unallocated: result.unallocated.toString(),
        };
      }),
    });
  });
  route(app, services, "GET", "/merchants/:slug/record", "public", async (c) => {
    const owner = await store.identity("slug", c.req.param("slug") ?? "");
    if (!owner) throw new ApiProblem(404, "NOT_FOUND", "No such merchant.");
    return ok(c, await merchantRecordView(services, await store.require("merchant", owner)));
  });
  route(app, services, "POST", "/merchant/close", "merchant", async (c) => {
    const body = await input(c, clientMethodSchemas["merchants.close"].input);
    const merchant = await merchantFor(c, services);
    if (body.confirmation !== merchant.payload.name)
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        "Type your business name to close the workspace.",
      );
    const contract = await chain.ready();
    const head = await chain.client.getBlock();
    const total = await chain.client.readContract({
      address: contract,
      abi: spokeProtocolAbi,
      functionName: "totalCampaigns",
      blockNumber: head.number,
    });
    for (let id = 1n; id <= total; id++) {
      const fresh = await chain.campaign(id.toString(), head.number);
      if (
        fresh.campaign.merchant.toLowerCase() !==
        z.string().parse(merchant.payload.address).toLowerCase()
      )
        continue;
      if (
        !fresh.campaign.ended ||
        fresh.rewards.available > 0n ||
        fresh.rewards.pendingReserved > 0n ||
        fresh.proceeds.proceedsPending > 0n ||
        fresh.proceeds.proceedsClaimable > 0n
      )
        throw new ApiProblem(
          409,
          "BUSINESS_NOT_CLOSABLE",
          "End all campaigns and clear pending sales, proceeds and unused rewards first.",
        );
    }
    await stepUp(c, services, "merchants.close", body.confirmationToken);
    await store.put("merchant", merchant.id, merchant.owner, {
      ...merchant.payload,
      closedAt: new Date().toISOString(),
    });
    await store.audit(accountId(c), "merchant-closed", merchant.id);
    return ok(c, { ok: true });
  });
  return app;
};
