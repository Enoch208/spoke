import type { Address } from "viem";
import { demoTx, type TxRef } from "../../lib/client/demo/views/basics";
import { units } from "./catalog";
import { DAY, HOUR, MINUTE, demoId, iso } from "./ids";
import { GAS_DRIP_WEI, addressAt } from "./seed-accounts-parts";
import type { DemoCore, DemoPerson, TokenKey } from "./types";
import type { ActivityRow, SupportItem } from "./world";

export interface ActivityInput {
  kind: string;
  tx: TxRef;
  at: number;
  objectId: string;
  amount: bigint | null;
  token: TokenKey | null;
  status?: ActivityRow["status"];
}

export const activityRow = (core: DemoCore, input: ActivityInput): ActivityRow => {
  const token = input.token === null ? null : core.tokens[input.token];
  return {
    kind: input.kind,
    amount: input.amount === null ? null : input.amount.toString(),
    token:
      token === null
        ? null
        : {
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            name: token.name,
            testnet: true,
          },
    txHash: input.tx.hash,
    blockNumber: input.tx.blockNumber,
    status: input.status ?? "indexed",
    objectId: input.objectId,
    at: iso(input.at),
  };
};

const drip = (core: DemoCore, key: string, at: number): ActivityRow =>
  activityRow(core, {
    kind: "gasDrip",
    tx: demoTx(`gas:${key}`, at),
    at,
    objectId: demoId("drip", key),
    amount: GAS_DRIP_WEI,
    token: null,
    status: "done",
  });

const mint = (
  core: DemoCore,
  key: string,
  at: number,
  whole: number,
  status: ActivityRow["status"] = "indexed",
): ActivityRow =>
  activityRow(core, {
    kind: "mint",
    tx: demoTx(`mint:${key}`, at),
    at,
    objectId: demoId("mint", key),
    amount: units(whole),
    token: "sdusd",
    status,
  });

const finalizeRow = (
  core: DemoCore,
  saleId: string | undefined,
  at: number,
  status: ActivityRow["status"],
): ActivityRow[] =>
  saleId === undefined
    ? []
    : [
        activityRow(core, {
          kind: "finalize",
          tx: demoTx(`finalize:${saleId}:${status}`, at),
          at,
          objectId: saleId,
          amount: null,
          token: null,
          status,
        }),
      ];

const distributorHistory = (core: DemoCore, person: DemoPerson): ActivityRow[] => {
  const address: Address = addressAt(person, 0);
  const a = core.anchor;
  const pending = core.sales
    .filter((sale) => sale.status === "PENDING")
    .filter((sale) => sale.allocations.some((allocation) => allocation.owner === address))
    .sort((x, y) => x.unlockAt - y.unlockAt);
  const ready = pending.filter((sale) => sale.unlockAt <= a);
  const atRisk = pending.find((sale) => sale.unlockAt > a);
  const replaced = core.nodes
    .filter((node) => node.owner === address)
    .sort((x, y) => y.createdAt - x.createdAt)
    .slice(1, 2)
    .map((node) =>
      activityRow(core, {
        kind: "linkCreated",
        tx: demoTx(`node:${node.id}:replaced`, node.createdAt - 2 * MINUTE),
        at: node.createdAt - 2 * MINUTE,
        objectId: node.id,
        amount: null,
        token: null,
        status: "replaced",
      }),
    );
  return [
    drip(core, "mara-1", person.joinedAt + 5 * MINUTE),
    drip(core, "mara-2", a - 6 * HOUR),
    mint(core, "mara-1", person.joinedAt + 10 * MINUTE, 100),
    mint(core, "mara-2", a - 2 * DAY, 100, "unknown"),
    mint(core, "mara-3", a - 3 * DAY, 500, "rejected"),
    mint(core, "mara-4", a - 6 * MINUTE, 500, "confirmed"),
    mint(core, "mara-5", a - 4 * MINUTE, 100, "included"),
    mint(core, "mara-6", a - 45_000, 1000, "not_submitted"),
    ...finalizeRow(core, ready[0]?.id, a - 2 * MINUTE, "submitted"),
    ...finalizeRow(core, ready[1]?.id, a - MINUTE, "wallet_confirmation"),
    ...finalizeRow(core, atRisk?.id, a - 20 * MINUTE, "failed"),
    ...replaced,
  ];
};

const merchantHistory = (core: DemoCore, person: DemoPerson): ActivityRow[] => [
  drip(core, "rhea-1", person.joinedAt + 5 * MINUTE),
  mint(core, "rhea-1", person.joinedAt + 20 * MINUTE, 100),
];

const buyerHistory = (core: DemoCore, person: DemoPerson): ActivityRow[] => [
  mint(core, "sam-1", person.joinedAt + 30 * MINUTE, 100),
  mint(core, "sam-2", core.anchor - 21 * DAY, 100),
  mint(core, "sam-3", core.anchor - DAY - HOUR, 100),
];

export const seededHistory = (core: DemoCore, person: DemoPerson): ActivityRow[] => {
  if (person.id === core.personas.distributor) return distributorHistory(core, person);
  if (person.id === core.personas.merchant) return merchantHistory(core, person);
  if (person.id === core.personas.buyer) return buyerHistory(core, person);
  return [];
};

export const seededSupport = (core: DemoCore, person: DemoPerson): SupportItem[] => {
  if (person.id !== core.personas.distributor) return [];
  const a = core.anchor;
  return [
    {
      id: demoId("ticket", "mara-1"),
      subject: "Why was my Regex cookbook link hidden?",
      category: "other",
      status: "resolved",
      createdAt: iso(a - 29 * DAY),
      updatedAt: iso(a - 27 * DAY),
    },
    {
      id: demoId("ticket", "mara-2"),
      subject: "Refunded sale still counted on my profile",
      category: "account",
      status: "answered",
      createdAt: iso(a - 9 * DAY),
      updatedAt: iso(a - 7 * DAY),
    },
  ];
};
