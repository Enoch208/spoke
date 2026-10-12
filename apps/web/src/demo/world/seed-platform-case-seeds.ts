import type { ClientInput } from "@spoke/protocol";
import { blockAt, demoTx, type TxRef } from "../../lib/client/demo/views/basics";
import { DAY, HOUR, MINUTE, demoId } from "./ids";
import { COUNTERFEIT_NOTICE, moderationTimes } from "./seed-platform-moderation";
import { SEEDED_RUNS, runAt } from "./seed-platform-recon";
import type { DemoCore, DemoNode, DemoSale } from "./types";
import type { DemoOpsCase } from "./world";

export type CaseActionId = ClientInput<"ops.act">["action"]["action"];

interface Step {
  action: CaseActionId;
  at: number;
  note: string;
  publicNote?: string;
}

export interface CaseSeed {
  n: number;
  category: string;
  severity: DemoOpsCase["severity"];
  subject: string;
  openedAt: number;
  openedBy: string | null;
  trigger: string;
  steps: Step[];
  evidence: TxRef[];
}

const nodeTx = (node: DemoNode) => demoTx(`node:${node.id}`, node.createdAt);
const purchaseTx = (sale: DemoSale) => demoTx(`sale:${sale.id}:purchase`, sale.purchasedAt);

export const caseSeeds = (core: DemoCore): CaseSeed[] => {
  const { anchor } = core;
  const at = moderationTimes(anchor);
  const nodesOf = (personId: string) => {
    const owner = core.people.find((person) => person.id === personId);
    return core.nodes.filter((node) => owner?.addresses.includes(node.owner));
  };
  const buyer = core.people.find((person) => person.id === core.personas.buyer)?.addresses[0];
  const branchSales = core.sales
    .filter((sale) => sale.nodeId === demoId("n", "1-daniel") && sale.buyer !== buyer)
    .slice(-3);
  const branchOpened = (branchSales.at(-1)?.purchasedAt ?? anchor - DAY) + 20 * MINUTE;
  const pricing = core.campaigns.find((campaign) => campaign.id === demoId("c", 6));
  const pricingSale = core.sales
    .filter((sale) => sale.campaignId === demoId("c", 6) && sale.status === "FINALIZED")
    .at(-1);
  const subscription = core.campaigns.find((campaign) => campaign.id === demoId("c", 8));
  const mismatchRun = runAt(anchor, SEEDED_RUNS - 1);
  return [
    {
      n: 1,
      category: "Self-referral attempt",
      severity: "low",
      subject: `distributor:${demoId("u", 21)}`,
      openedAt: anchor - 6 * DAY,
      openedBy: "contract rule",
      trigger:
        "Rule: self-referral block v1. A checkout through this person's own link was rejected with SELF_REFERRAL before any payment.",
      steps: [
        {
          action: "assign",
          at: anchor - 6 * DAY + HOUR,
          note: "Taking this one to confirm nothing reached the chain.",
        },
        {
          action: "addNote",
          at: anchor - 6 * DAY + 2 * HOUR,
          note: "The rule worked as designed. No sale, receipt or reward exists for this attempt.",
        },
        {
          action: "close",
          at: anchor - 5 * DAY,
          note: "No action needed: the attempt was blocked before payment and nothing was recorded onchain.",
        },
      ],
      evidence: nodesOf(demoId("u", 21)).slice(0, 1).map(nodeTx),
    },
    {
      n: 2,
      category: "Linked-wallet pattern",
      severity: "high",
      subject: `distributor:${demoId("u", 12)}`,
      openedAt: branchOpened,
      openedBy: "risk rule",
      trigger:
        "Rule: linked-wallet pattern v1. Three buyer wallets funded by one address minutes before buying bought through the same branch.",
      steps: [
        {
          action: "assign",
          at: branchOpened + 2 * HOUR,
          note: "Assigning to myself to pull the funding transfers.",
        },
        {
          action: "addNote",
          at: branchOpened + 3 * HOUR,
          note: "All three buyer wallets received test funds from one address shortly before each purchase. Path membership is link ancestry, not proof of intent.",
        },
      ],
      evidence: branchSales.flatMap((sale) => [
        demoTx(`funding:${sale.id}`, sale.purchasedAt - 6 * MINUTE),
        purchaseTx(sale),
      ]),
    },
    {
      n: 3,
      category: "Counterfeit or misleading listing",
      severity: "medium",
      subject: `merchant:${demoId("m", 3)}`,
      openedAt: at.counterfeitLinked,
      openedBy: null,
      trigger:
        "Opened from a user report: a buyer says State of indie SaaS pricing copies another publisher's data.",
      steps: [
        {
          action: "assign",
          at: at.counterfeitLinked + 10 * MINUTE,
          note: "Reviewing the report and the product page together.",
        },
        {
          action: "addPublicNotice",
          at: at.notice,
          note: "Adding a notice while we wait for the merchant's sources.",
          publicNote: COUNTERFEIT_NOTICE,
        },
        {
          action: "requestInformation",
          at: at.notice + 10 * MINUTE,
          note: "Asked the merchant where the 400 price pages came from.",
          publicNote: "Please share the sources behind the 400 price pages used in this report.",
        },
      ],
      evidence: [
        ...(pricing ? [demoTx(`campaign:${pricing.id}:create`, pricing.createdAt)] : []),
        ...(pricingSale ? [purchaseTx(pricingSale)] : []),
      ],
    },
    {
      n: 4,
      category: "Refund pattern",
      severity: "high",
      subject: `campaign:${demoId("c", 8)}`,
      openedAt: anchor - 2 * DAY,
      openedBy: "risk rule",
      trigger:
        "Rule: refund pattern v1. The merchant refunded six of its last eight sales in the hour before each unlock.",
      steps: [
        {
          action: "assign",
          at: anchor - 2 * DAY + HOUR,
          note: "Taking this. Refund timing looks deliberate, checking the order history.",
        },
        {
          action: "freezeNewActivity",
          at: at.frozen,
          note: "Freezing new orders and links for 72 hours while the merchant explains the refunds.",
          publicNote: "New orders are paused on Spoke for 72 hours while we review recent refunds.",
        },
        {
          action: "askMerchantToPause",
          at: at.frozen + 5 * MINUTE,
          note: "Asked the merchant to pause the campaign onchain from their dashboard.",
        },
      ],
      evidence: [
        ...(subscription
          ? [demoTx(`campaign:${subscription.id}:create`, subscription.createdAt)]
          : []),
        ...Array.from({ length: 6 }, (_, index) =>
          demoTx(
            `sample-refund-pattern:${String(index + 1)}`,
            anchor - 2 * DAY - (6 - index) * 5 * HOUR,
          ),
        ),
      ],
    },
    {
      n: 5,
      category: "Reconciliation mismatch",
      severity: "medium",
      subject: `alert:${demoId("c", 3)}`,
      openedAt: mismatchRun + 2 * MINUTE,
      openedBy: "reconciliation",
      trigger: `Reconciliation at block ${blockAt(mismatchRun)} found the indexer's reserved bucket for this campaign 2.50 SDUSD above the contract value.`,
      steps: [],
      evidence: [demoTx(`reconciliation:${demoId("c", 3)}`, mismatchRun)],
    },
    {
      n: 6,
      category: "Appeal",
      severity: "low",
      subject: `distributor:${demoId("u", 28)}`,
      openedAt: at.appeal,
      openedBy: "appeals",
      trigger:
        "Appeal received: the distributor asks for their profile to show in discovery again and says the posts were in their own newsletter threads.",
      steps: [],
      evidence: nodesOf(demoId("u", 28)).map(nodeTx),
    },
  ];
};
