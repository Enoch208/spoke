import { z } from "zod";
import {
  campaignFilters,
  commissionPolicy,
  campaignPolicy,
  checkoutPreview,
  joinPreview,
  simulatePolicy,
  spokeProtocolAbi,
  uintString,
  walletAddress,
} from "@spoke/protocol";
import { viewerSession } from "../services/viewer.js";
import { input, merchantFor, route, router } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import { ok } from "../http/respond.js";
import {
  allocations,
  campaignCard,
  campaignDraftRow,
  publicNode,
  related,
  statsView,
} from "../services/views.js";
import { policyView, translateChainError } from "../services/chain.js";
import { allRecords, pageValues } from "../services/read-utils.js";
import { detailView, merchantCampaignView } from "../services/campaigns.js";
import { chainAncestry } from "../services/chain-ancestry.js";
import { actorView } from "../services/evidence.js";
import { graphRoutes } from "./graph.js";
import { campaignActivityRoutes } from "./campaign-activity.js";
import { participantRoutes } from "./participants.js";
import type { Services } from "../types.js";

export const campaignRoutes = (services: Services) => {
  const app = router();
  const { store, chain } = services;
  route(app, services, "GET", "/campaigns", "public", async (c) => {
    const raw = c.req.query();
    const query = campaignFilters.parse({
      ...raw,
      limit: raw.limit ? Number(raw.limit) : undefined,
      rateMin: raw.rateMin ? Number(raw.rateMin) : undefined,
      rateMax: raw.rateMax ? Number(raw.rateMax) : undefined,
      levels: raw.levels ? Number(raw.levels) : undefined,
      holdMax: raw.holdMax ? Number(raw.holdMax) : undefined,
      invitationOnly: raw.invitationOnly === undefined ? undefined : raw.invitationOnly === "true",
      excludeJoined: raw.excludeJoined === undefined ? undefined : raw.excludeJoined === "true",
    });
    const viewer = query.excludeJoined ? await viewerSession(c, services) : null;
    if (query.excludeJoined && !viewer)
      throw new ApiProblem(401, "UNAUTHENTICATED", "Sign in to exclude your joined campaigns.");
    const joined = viewer
      ? new Set(
          (await allRecords(store, "node", viewer.address.toLowerCase())).map((row) =>
            z.string().parse(row.payload.campaignId),
          ),
        )
      : new Set<string>();
    let rows = await Promise.all(
      (await allRecords(store, "campaign")).map((row) => campaignCard(store, row)),
    );
    rows = rows.filter(
      (row) =>
        !joined.has(row.campaignId) &&
        (!query.q ||
          `${row.product.title} ${row.product.summary} ${row.merchant.name}`
            .toLowerCase()
            .includes(query.q.toLowerCase())) &&
        (!query.category || row.product.category === query.category) &&
        (!query.rateMin || row.policy.commissionBps >= query.rateMin) &&
        (!query.rateMax || row.policy.commissionBps <= query.rateMax) &&
        (!query.levels || row.policy.maxRewardedAncestors === query.levels) &&
        (query.holdMax === undefined || row.policy.holdSeconds <= query.holdMax) &&
        (!query.budgetLeftMin || BigInt(row.rewardAvailable) >= BigInt(query.budgetLeftMin)) &&
        (!query.source || query.source === "NATIVE_ONCHAIN") &&
        !query.invitationOnly &&
        (!query.merchant ||
          row.merchant.slug === query.merchant ||
          row.merchant.address.toLowerCase() === query.merchant.toLowerCase()) &&
        (!query.status ||
          {
            active: "FUNDED_ACTIVE",
            paused: "PAUSED",
            ended: "ENDED",
            expired: "EXPIRED",
            not_live: "CREATED_UNFUNDED",
          }[query.status] === row.state),
    );
    rows.sort((a, b) =>
      query.sort === "hold"
        ? a.policy.holdSeconds - b.policy.holdSeconds
        : query.sort === "budget"
          ? BigInt(a.rewardAvailable) === BigInt(b.rewardAvailable)
            ? 0
            : BigInt(a.rewardAvailable) > BigInt(b.rewardAvailable)
              ? -1
              : 1
          : query.sort === "reward"
            ? b.policy.commissionBps - a.policy.commissionBps
            : BigInt(a.campaignId) > BigInt(b.campaignId)
              ? -1
              : 1,
    );
    return ok(c, { ...pageValues(c, rows, (row) => row.campaignId), total: rows.length });
  });
  route(app, services, "GET", "/campaigns/:id", "public", async (c) => {
    const result = await detailView(
      services,
      await store.require("campaign", uintString.parse(c.req.param("id") ?? "")),
    );
    c.set("blockNumber", result.blockNumber);
    return ok(c, result.detail);
  });
  route(app, services, "GET", "/campaigns/:id/stats", "public", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    await store.require("campaign", id);
    return ok(c, await statsView(store, id));
  });
  route(app, services, "GET", "/campaigns/:id/policy", "public", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    const head = await chain.head();
    const fresh = await chain.campaign(id, BigInt(head.blockNumber));
    c.set("blockNumber", head.blockNumber);
    return ok(
      c,
      campaignPolicy.parse({
        current: policyView(fresh.currentPolicy),
        scheduled: fresh.scheduledPolicy.version === 0 ? null : policyView(fresh.scheduledPolicy),
        history: (await related(store, "policy-version", "campaignId", id))
          .map((row) => row.payload)
          .sort((a, b) => z.number().parse(a.version) - z.number().parse(b.version)),
      }),
    );
  });
  route(app, services, "GET", "/campaigns/:id/checkout-preview", "public", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    const buyer = walletAddress.parse(
      c.req.query("buyer") ?? "0x0000000000000000000000000000000000000001",
    );
    const node = uintString.parse(c.req.query("node") ?? "0");
    const head = await chain.head();
    const fresh = await chain.campaign(id, BigInt(head.blockNumber));
    const policy = policyView(fresh.currentPolicy);
    const path = node === "0" ? [] : await chainAncestry(services, node, BigInt(head.blockNumber));
    if (path.some((row) => row.payload.campaignId !== id))
      throw new ApiProblem(400, "INVALID_REFERRAL_PATH", "Referral belongs to another campaign.");
    const theoretical = simulatePolicy(
      fresh.campaign.skuPrice,
      commissionPolicy.strip().parse(policy),
      path.length,
    );
    let blocking = null;
    let rewardTotal = node === "0" ? "0" : theoretical.reserved.toString();
    let unallocated = node === "0" ? "0" : theoretical.unallocated.toString();
    let split = path.slice(0, policy.maxRewardedAncestors).map((row, depth) => ({
      recipient: z.string().parse(row.payload.creator),
      depth,
      amount: theoretical.amounts[depth]?.toString() ?? "0",
      effectiveWeightBps: theoretical.weightsBps[depth] ?? 0,
    }));
    try {
      const preview = await chain.preview(id, node, buyer, BigInt(head.blockNumber));
      rewardTotal = preview.rewardTotal;
      unallocated = preview.unallocated;
      split = allocations.parse(preview.allocations).map((allocation) => ({
        ...allocation,
        effectiveWeightBps: allocation.effectiveWeightBps,
      }));
    } catch (error) {
      const problem = translateChainError(error);
      if (problem.status !== 409) throw problem;
      blocking = {
        code: problem.code,
        contractError:
          typeof problem.details?.contractError === "string" ? problem.details.contractError : null,
      };
    }
    const recipients = await Promise.all(
      path.slice(0, policy.maxRewardedAncestors).map(async (row, depth) => {
        const actor = await publicNode(store, row);
        const allocation = split[depth];
        return {
          nodeId: row.id,
          creator: {
            address: actor.creator ?? null,
            handle: actor.handle ?? null,
            displayName: actor.displayName ?? null,
            visibility: actor.visibility,
          },
          depth,
          paid: allocation !== undefined,
          repeatedWallet: false,
          outsideWindow: false,
          effectiveWeightBps: allocation?.effectiveWeightBps ?? 0,
          amount: allocation?.amount ?? "0",
          state: null,
          reasonIfUnpaid: null,
        };
      }),
    );
    const metadata = await store.get("campaign-metadata", id);
    const directPurchaseAvailable =
      fresh.campaign.active &&
      !fresh.campaign.paused &&
      !fresh.campaign.ended &&
      BigInt(policy.expiry) > BigInt(Math.floor(Date.parse(head.at) / 1000)) &&
      fresh.campaign.saleCount < 100;
    let buyerData;
    if (c.req.query("buyer")) {
      const balances = await chain.balances(buyer, BigInt(head.blockNumber));
      const contract = await chain.ready();
      const previous = await chain.client.readContract({
        address: contract,
        abi: spokeProtocolAbi,
        functionName: "saleIdForBuyer",
        args: [BigInt(id), buyer],
        blockNumber: BigInt(head.blockNumber),
      });
      buyerData = {
        tokenBalance: balances.sdusd ?? "0",
        allowance: balances.sdusdAllowanceToProtocol ?? "0",
        monWei: balances.monWei,
        alreadyPurchasedSaleId: previous === 0n ? null : previous.toString(),
        buyerOnPath: path.some((row) => row.owner === buyer.toLowerCase()),
        buyerIsMerchant: buyer.toLowerCase() === fresh.campaign.merchant.toLowerCase(),
      };
    }
    c.set("blockNumber", head.blockNumber);
    return ok(
      c,
      checkoutPreview.parse({
        price: fresh.campaign.skuPrice.toString(),
        recipients,
        rewardTotal,
        unallocated,
        policyHash: policy.policyHash,
        policyVersion: policy.version,
        nextPolicy:
          fresh.scheduledPolicy.version === 0
            ? null
            : {
                policyHash: fresh.scheduledPolicy.policyHash,
                effectiveAt: new Date(
                  Number(fresh.scheduledPolicy.effectiveAt) * 1000,
                ).toISOString(),
              },
        directPurchaseAvailable: directPurchaseAvailable && !buyerData?.alreadyPurchasedSaleId,
        blockNumber: head.blockNumber,
        holdSeconds: policy.holdSeconds,
        refundPolicy: metadata?.payload.refundPolicy ?? "",
        blocking,
        ...(buyerData ? { buyer: buyerData } : {}),
      }),
    );
  });
  route(app, services, "GET", "/campaigns/:id/join-preview", "session", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    const parent = uintString.parse(c.req.query("parent") ?? "0");
    const contract = await chain.ready();
    const head = await chain.client.getBlock();
    const fresh = await chain.campaign(id, head.number);
    const existing = await chain.client.readContract({
      address: contract,
      abi: spokeProtocolAbi,
      functionName: "nodeOf",
      args: [BigInt(id), walletAddress.parse(c.get("session").address)],
      blockNumber: head.number,
    });
    const parentNode = parent === "0" ? null : await chain.node(parent);
    const validParent = !parentNode || parentNode.campaignId.toString() === id;
    const parentRows =
      parent === "0" || !validParent ? [] : await chainAncestry(services, parent, head.number);
    const ancestors = await Promise.all(
      parentRows.map(async (row, depth) => ({
        nodeId: row.id,
        creator: await actorView(store, z.string().parse(row.payload.creator)),
        depth,
        paid: false,
        repeatedWallet: false,
        outsideWindow: false,
        effectiveWeightBps: 0,
        amount: "0",
        state: null,
        reasonIfUnpaid: null,
      })),
    );
    const policy = policyView(fresh.currentPolicy);
    const eligibility =
      existing > 0n
        ? "already_joined"
        : fresh.campaign.merchant.toLowerCase() === c.get("session").address.toLowerCase()
          ? "is_merchant"
          : fresh.campaign.ended || fresh.campaign.endsAt <= head.timestamp
            ? "ended"
            : fresh.campaign.paused
              ? "paused"
              : !validParent
                ? "invalid_parent"
                : fresh.campaign.nodeCount >= 256
                  ? "capacity_reached"
                  : "ok";
    return ok(
      c,
      joinPreview.parse({
        eligibility,
        nodeId: existing === 0n ? null : existing.toString(),
        enforcedBy: "contract",
        budgetState:
          fresh.rewards.available > 0n
            ? "funded"
            : fresh.campaign.active
              ? "exhausted"
              : "unfunded",
        depth: ancestors.length + 1,
        ancestorsAbove: ancestors,
        policy,
        exampleAmounts: simulatePolicy(
          fresh.campaign.skuPrice,
          commissionPolicy.strip().parse(policy),
          ancestors.length + 1,
        ).amounts.map(String),
      }),
    );
  });
  route(app, services, "GET", "/merchant/campaigns", "merchant", async (c) => {
    const merchant = await merchantFor(c, services);
    const drafts = await allRecords(store, "draft", merchant.id);
    const campaigns = await allRecords(
      store,
      "campaign",
      z.string().parse(merchant.payload.address).toLowerCase(),
    );
    let rows = [
      ...(await Promise.all(
        drafts
          .filter((row) => !row.payload.launchTxHash)
          .map((row) => campaignDraftRow(store, row)),
      )),
      ...(await Promise.all(campaigns.map((row) => merchantCampaignView(services, row)))),
    ];
    const countsByState = Object.fromEntries(
      [...new Set(rows.map((row) => row.state))].map((state) => [
        state,
        rows.filter((row) => row.state === state).length,
      ]),
    );
    const status = c.req.query("status");
    const q = c.req.query("q")?.toLowerCase();
    const states: Record<string, string> = {
      active: "FUNDED_ACTIVE",
      not_live: "CREATED_UNFUNDED",
      paused: "PAUSED",
      ended: "ENDED",
      expired: "EXPIRED",
      draft: "DRAFT_OFFCHAIN",
    };
    rows = rows.filter(
      (row) =>
        (!status || row.state === states[status]) &&
        (!q || z.string().parse(row.productTitle).toLowerCase().includes(q)) &&
        (!c.req.query("source") || row.source === c.req.query("source")) &&
        (!c.req.query("eligibility") || row.eligibility === c.req.query("eligibility")),
    );

    return ok(c, {
      ...pageValues(c, rows, (row) => row.draftId ?? row.campaignId ?? ""),
      countsByState,
    });
  });
  route(app, services, "PATCH", "/merchant/campaigns/:id/settings", "merchant", async (c) => {
    const id = uintString.parse(c.req.param("id") ?? "");
    const merchant = await merchantFor(c, services);
    await store.require("campaign", id, z.string().parse(merchant.payload.address).toLowerCase());
    const body = await input(
      c,
      z.strictObject({ budgetAlertSales: z.number().int().min(1).max(50) }),
    );
    await store.put("campaign-settings", id, merchant.id, body);
    return ok(c, body);
  });
  route(app, services, "GET", "/merchants/:slug/offers", "public", async (c) => {
    const owner = await store.identity("slug", c.req.param("slug") ?? "");
    if (!owner) throw new ApiProblem(404, "NOT_FOUND", "No such merchant.");
    const merchant = await store.require("merchant", owner);
    const rows = await Promise.all(
      (
        await allRecords(
          store,
          "campaign",
          z.string().parse(merchant.payload.address).toLowerCase(),
        )
      ).map((row) => campaignCard(store, row)),
    );
    return ok(
      c,
      pageValues(c, rows, (row) => row.campaignId),
    );
  });
  app.route("/", graphRoutes(services));
  app.route("/", campaignActivityRoutes(services));
  app.route("/", participantRoutes(services));
  return app;
};
