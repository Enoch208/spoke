import { demoId, iso } from "../../../../demo/world/ids";
import { RISK_DEBT_BY_DISPUTE } from "../../../../demo/world/seed-growth-core-chargebacks";
import { buyerActor, eventOf, merchantActor } from "../../../../demo/world/seed-growth-core-cases";
import type { DemoMerchant } from "../../../../demo/world/types";
import type { Dispute, DemoWorld } from "../../../../demo/world/world";
import { fail, found, type DemoInput, type PartialHandlers } from "../handler";
import { ownsAddress, page, sum } from "../views/basics";
import { campaignOf } from "../views/catalog";
import { merchantsOwnedBy } from "../views/merchant-org";
import { refundTx, saleOf } from "../views/receipt";
import { merchantFor } from "./growth-scope";

type Outcome = DemoInput<"disputes.respond">["outcome"];

const CLOSED = new Set<Dispute["status"]>(["refunded", "declined", "covered"]);

const OUTCOMES: Record<Dispute["kind"], readonly Outcome[]> = {
  refund_request: ["refunded", "declined", "explained", "escalated"],
  attribution_appeal: ["explained", "escalated", "refunded"],
  moderation_appeal: ["appealed", "explained", "escalated"],
  chargeback: ["covered", "explained", "refunded", "escalated"],
};

const merchantDisputes = (world: DemoWorld, merchant: DemoMerchant): Dispute[] =>
  world.disputes.filter(
    (dispute) => campaignOf(world, dispute.campaignId)?.merchantId === merchant.id,
  );

const hasEvent = (dispute: Dispute, kind: string) =>
  dispute.events.some((event) => event.kind === kind);

const windowOpen = (world: DemoWorld, dispute: Dispute, now: number) => {
  const sale = saleOf(world, dispute.saleId);
  return sale !== undefined && sale.status === "PENDING" && now < sale.unlockAt;
};

const matchesStatus = (dispute: Dispute, status: string | undefined) =>
  status === undefined ||
  (status === "closed" ? CLOSED.has(dispute.status) : dispute.status === status);

export const disputesReads = {
  "disputes.list": (input, runtime) => {
    const items = merchantDisputes(runtime.world, merchantFor(runtime))
      .filter((dispute) => input.kind === undefined || dispute.kind === input.kind)
      .filter((dispute) => matchesStatus(dispute, input.status))
      .reverse()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return page(items, input);
  },
  "disputes.get": (input, runtime) => {
    const world = runtime.world;
    const dispute = found(
      world.disputes.find((candidate) => candidate.id === input.id),
      "That case",
    );
    const sale = saleOf(world, dispute.saleId);
    const runs = merchantsOwnedBy(world, runtime.personaId()).some(
      (merchant) => campaignOf(world, dispute.campaignId)?.merchantId === merchant.id,
    );
    const bought = sale !== undefined && ownsAddress(world, runtime.personaId(), sale.buyer);
    return runs || bought ? dispute : fail("NOT_FOUND", "That case isn't in the sample world.");
  },
  "disputes.exposure": (_input, runtime) => {
    const world = runtime.world;
    const disputes = merchantDisputes(world, merchantFor(runtime));
    const requests = disputes.filter(
      (dispute) =>
        dispute.kind === "refund_request" &&
        dispute.status === "open" &&
        windowOpen(world, dispute, runtime.now()),
    );
    const active = disputes.filter((dispute) => !CLOSED.has(dispute.status));
    const chargebacks = active.filter((dispute) => dispute.kind === "chargeback");
    return {
      openRefundRequests: requests.length,
      refundValue: sum(
        requests.map((dispute) => saleOf(world, dispute.saleId)?.price ?? 0n),
      ).toString(),
      appeals: active.filter(
        (dispute) => dispute.kind === "attribution_appeal" || dispute.kind === "moderation_appeal",
      ).length,
      chargebacks: chargebacks.filter(
        (dispute) => !hasEvent(dispute, "storeLost") && !hasEvent(dispute, "storeWon"),
      ).length,
      riskDebt: sum(
        chargebacks.map((dispute) => RISK_DEBT_BY_DISPUTE[dispute.id] ?? 0n),
      ).toString(),
    };
  },
} satisfies PartialHandlers<"disputes">;

export const disputesWrites = {
  "disputes.open": (input, runtime) => {
    const world = runtime.world;
    const now = runtime.now();
    const sale = found(saleOf(world, input.saleId), "That sale");
    if (!ownsAddress(world, runtime.personaId(), sale.buyer))
      return fail("NOT_AUTHORIZED", "Only the buyer can ask for a refund on this sale.");
    if (sale.status === "REFUNDED") return fail("SALE_REFUNDED", "This sale was already refunded.");
    if (sale.status === "FINALIZED")
      return fail(
        "SALE_ALREADY_FINALIZED",
        "This sale is final, so Spoke can't refund it. Any refund now is between you and the merchant, outside Spoke.",
      );
    if (now >= sale.unlockAt)
      return fail(
        "REFUND_WINDOW_CLOSED",
        "The refund window has closed. This sale can be finalized, not refunded.",
      );
    const asked = world.disputes.some(
      (dispute) =>
        dispute.saleId === sale.id &&
        dispute.kind === "refund_request" &&
        dispute.status === "open",
    );
    if (asked) return fail("CONFLICT", "You already asked for a refund on this sale.");
    const id = demoId("dispute", runtime.nextId("dispute"));
    world.disputes.push({
      id,
      saleId: sale.id,
      campaignId: sale.campaignId,
      kind: "refund_request",
      status: "open",
      reason: input.reason,
      message: input.message,
      createdAt: iso(now),
      events: [eventOf(id, 1, now, buyerActor(sale.buyer), "requested", input.message)],
    });
    return { disputeId: id, status: "open" };
  },
  "disputes.respond": (input, runtime) => {
    const world = runtime.world;
    const merchant = merchantFor(runtime);
    const dispute = found(
      merchantDisputes(world, merchant).find((candidate) => candidate.id === input.id),
      "That case",
    );
    if (CLOSED.has(dispute.status))
      return fail("VALIDATION_FAILED", "This case is already closed.");
    if (!OUTCOMES[dispute.kind].includes(input.outcome))
      return fail("VALIDATION_FAILED", "That answer doesn't apply to this kind of case.");
    const sale = saleOf(world, dispute.saleId);
    if (input.outcome === "refunded" && sale?.status !== "REFUNDED")
      return fail(
        "VALIDATION_FAILED",
        "Refund the sale first. The case is marked refunded once the refund is recorded onchain.",
      );
    if (input.outcome === "covered" && !hasEvent(dispute, "storeLost"))
      return fail(
        "VALIDATION_FAILED",
        "Only a chargeback lost at the store can be recorded as covered.",
      );
    const event = eventOf(
      dispute.id,
      dispute.events.length + 1,
      runtime.now(),
      merchantActor(merchant),
      input.outcome,
      input.message,
      input.outcome === "refunded" && sale ? refundTx(sale) : null,
    );
    const next: Dispute = { ...dispute, status: input.outcome, events: [...dispute.events, event] };
    world.disputes = world.disputes.map((candidate) =>
      candidate.id === next.id ? next : candidate,
    );
    return next;
  },
} satisfies PartialHandlers<"disputes">;
