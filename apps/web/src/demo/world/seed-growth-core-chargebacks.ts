import { units } from "./catalog";
import { DAY, MINUTE, demoId } from "./ids";
import {
  caseOf,
  merchantActor,
  namedActor,
  settledIn,
  type CaseContext,
} from "./seed-growth-core-cases";
import type { Dispute } from "./world";

export const LOST_CHARGEBACK_ID = demoId("dispute", "chargeback-lost");

export const RISK_DEBT_BY_DISPUTE: Readonly<Record<string, bigint>> = {
  [LOST_CHARGEBACK_ID]: units(12),
};

const STORE = namedActor("Sample store");

const HELD =
  "The cardholder says the order never arrived. The sale stays pending until the store resolves the dispute.";
const LATE = "The cardholder disputed the charge at the store after the sale settled.";
const LOST =
  "The store ruled for the cardholder. 12.00 SDUSD is recorded as risk debt on your account. Distributors keep their settled rewards.";
const DUPLICATE = "The cardholder reported a duplicate charge at the store.";

export const seedChargebacks = (context: CaseContext, taken: ReadonlySet<string>): Dispute[] => {
  const { core, merchant } = context;
  const you = merchantActor(merchant);
  const disputes: Dispute[] = [];
  const held = core.sales
    .filter(
      (sale) =>
        sale.campaignId === demoId("c", 1) && sale.status === "PENDING" && !taken.has(sale.id),
    )
    .sort((a, b) => b.unlockAt - a.unlockAt)[0];
  if (held)
    disputes.push(
      caseOf({
        key: "chargeback-held",
        sale: held,
        kind: "chargeback",
        status: "open",
        reason: "Item not received",
        message: HELD,
        events: [[core.anchor - 40 * MINUTE, STORE, "storeDisputeOpened", HELD]],
      }),
    );
  const lost = settledIn(context, 1, core.anchor - 30 * DAY);
  if (lost) {
    const start = (lost.finalizedAt ?? lost.unlockAt) + 2 * DAY;
    disputes.push(
      caseOf({
        key: "chargeback-lost",
        sale: lost,
        kind: "chargeback",
        status: "open",
        reason: "Unrecognised charge",
        message: LATE,
        events: [
          [start, STORE, "storeDisputeOpened", LATE],
          [
            start + DAY,
            you,
            "evidenceSent",
            "Sent the delivery log and download history to the store.",
          ],
          [start + 8 * DAY, STORE, "storeLost", LOST],
        ],
      }),
    );
  }
  const won = settledIn(context, 2, core.anchor - 20 * DAY);
  if (won) {
    const start = (won.finalizedAt ?? won.unlockAt) + DAY;
    disputes.push(
      caseOf({
        key: "chargeback-won",
        sale: won,
        kind: "chargeback",
        status: "declined",
        reason: "Duplicate charge",
        message: DUPLICATE,
        events: [
          [start, STORE, "storeDisputeOpened", DUPLICATE],
          [start + DAY, you, "evidenceSent", "Sent the single order record to the store."],
          [
            start + 5 * DAY,
            STORE,
            "storeWon",
            "The store ruled in your favour. Nothing changes on Spoke.",
          ],
        ],
      }),
    );
  }
  return disputes;
};
