import { refundTx } from "../../lib/client/demo/views/receipt";
import { DAY, HOUR, MINUTE, demoId } from "./ids";
import { seedAppeals } from "./seed-growth-core-appeals";
import {
  buyerActor,
  caseOf,
  latest,
  merchantActor,
  ownerOf,
  type CaseContext,
  type CaseEvent,
} from "./seed-growth-core-cases";
import { seedChargebacks } from "./seed-growth-core-chargebacks";
import type { DemoCore, DemoSale } from "./types";
import type { Dispute } from "./world";

export const CLOSING_WINDOW = 20 * MINUTE;

const addressesOf = (core: DemoCore, id: string): Set<string> =>
  new Set(
    core.people
      .find((person) => person.id === id)
      ?.addresses.map((address) => address.toLowerCase()) ?? [],
  );

export const closingSales = (core: DemoCore): DemoSale[] =>
  core.sales
    .filter(
      (sale) =>
        sale.campaignId === demoId("c", 1) &&
        sale.status === "PENDING" &&
        sale.unlockAt > core.anchor &&
        sale.unlockAt <= core.anchor + CLOSING_WINDOW,
    )
    .sort((a, b) => a.unlockAt - b.unlockAt);

interface RequestSpec {
  key: string;
  sale: DemoSale | undefined;
  status: Dispute["status"];
  reason: string;
  message: string;
  at: (sale: DemoSale) => number;
  replies: (sale: DemoSale) => readonly CaseEvent[];
}

const requestSpecs = (context: CaseContext, requested: readonly DemoSale[]): RequestSpec[] => {
  const { core, merchant } = context;
  const you = merchantActor(merchant);
  const refunded = core.sales.find(
    (sale) => sale.campaignId === demoId("c", 1) && sale.status === "REFUNDED" && !sale.reversed,
  );
  const settled = latest(
    core.sales.filter(
      (sale) =>
        sale.campaignId === demoId("c", 1) &&
        sale.status === "FINALIZED" &&
        sale.nodeId !== null &&
        sale.purchasedAt <= core.anchor - 3 * DAY,
    ),
  );
  return [
    {
      key: "request-closing",
      sale: requested[0],
      status: "open",
      reason: "Didn't receive it",
      message:
        "I paid but the download link never arrived, and the receipt page shows no files for me.",
      at: () => core.anchor - 25 * MINUTE,
      replies: () => [],
    },
    {
      key: "request-open",
      sale: requested[1],
      status: "open",
      reason: "Not as described",
      message:
        "The pack has eight layouts, not the twelve the product page lists. I'd like a refund.",
      at: () => core.anchor - 2 * HOUR,
      replies: () => [[core.anchor - 90 * MINUTE, you, "viewed", "Viewed by you."]],
    },
    {
      key: "request-declined",
      sale: settled,
      status: "declined",
      reason: "Bought by mistake",
      message: "I already own a similar pack and bought this one by mistake.",
      at: (sale) => sale.purchasedAt + 6 * HOUR,
      replies: (sale) => [
        [
          sale.purchasedAt + 10 * HOUR,
          you,
          "declined",
          "The files were delivered at checkout and the download log shows two downloads. Happy to help you set them up.",
        ],
      ],
    },
    {
      key: "request-refunded",
      sale: refunded,
      status: "refunded",
      reason: "Other",
      message: "The proposal layouts don't open in my version of the editor.",
      at: (sale) =>
        sale.purchasedAt + Math.floor(((sale.refundedAt ?? sale.unlockAt) - sale.purchasedAt) / 2),
      replies: (sale) => [
        [
          sale.refundedAt ?? sale.unlockAt,
          you,
          "refunded",
          "Refunded in full. Sorry the pack didn't fit your setup.",
          refundTx(sale),
        ],
      ],
    },
  ];
};

const refundRequests = (context: CaseContext, requested: readonly DemoSale[]): Dispute[] =>
  requestSpecs(context, requested).flatMap(({ sale, ...spec }) =>
    sale
      ? [
          caseOf({
            key: spec.key,
            sale,
            kind: "refund_request",
            status: spec.status,
            reason: spec.reason,
            message: spec.message,
            events: [
              [spec.at(sale), buyerActor(sale.buyer), "requested", spec.message],
              ...spec.replies(sale),
            ],
          }),
        ]
      : [],
  );

export const seedDisputes = (core: DemoCore): Dispute[] => {
  const merchant = core.merchants.find((candidate) => candidate.ownerId === core.personas.merchant);
  if (!merchant) return [];
  const context: CaseContext = {
    core,
    merchant,
    nodesById: new Map(core.nodes.map((node) => [node.id, node])),
  };
  const buyer = addressesOf(core, core.personas.buyer);
  const distributor = addressesOf(core, core.personas.distributor);
  const requested = closingSales(core)
    .filter(
      (sale) =>
        !buyer.has(sale.buyer.toLowerCase()) && !distributor.has(ownerOf(context, sale) ?? ""),
    )
    .slice(0, 2);
  const taken = new Set([
    ...requested.map((sale) => sale.id),
    ...core.sales.filter((sale) => buyer.has(sale.buyer.toLowerCase())).map((sale) => sale.id),
  ]);
  return [
    ...refundRequests(context, requested),
    ...seedAppeals(context),
    ...seedChargebacks(context, taken),
  ];
};
