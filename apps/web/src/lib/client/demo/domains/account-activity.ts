import { activityRow } from "../../../../demo/world/seed-accounts-history";
import type { ActivityRow, DemoWorld } from "../../../../demo/world/world";
import { fail, type PartialHandlers } from "../handler";
import { blockAt, demoTx, page } from "../views/basics";
import { claimTx, purchaseTx, refundTx } from "../views/receipt";
import { accountOf, balanceOf, findWallet, sameAddress, signerOf } from "./account-store";

export const activityGroups: Readonly<Record<string, readonly string[]>> = {
  purchases: ["purchase", "refund"],
  earnings: ["claim", "finalize"],
  links: ["linkCreated"],
  funding: ["mint", "gasDrip"],
  campaigns: [
    "campaignCreated",
    "campaignPaused",
    "campaignResumed",
    "campaignEnded",
    "budgetFunded",
    "budgetWithdrawn",
    "proceedsClaim",
  ],
};

const purchaseRows = (world: DemoWorld, address: string): ActivityRow[] =>
  world.sales
    .filter((sale) => sameAddress(sale.buyer, address))
    .flatMap((sale) => {
      const token =
        world.campaigns.find((campaign) => campaign.id === sale.campaignId)?.token ?? "sdusd";
      const bought = activityRow(world, {
        kind: "purchase",
        tx: purchaseTx(sale),
        at: sale.purchasedAt,
        objectId: sale.id,
        amount: sale.price,
        token,
      });
      const refund = refundTx(sale);
      if (refund === null || sale.refundedAt === null) return [bought];
      return [
        bought,
        activityRow(world, {
          kind: "refund",
          tx: refund,
          at: sale.refundedAt,
          objectId: sale.id,
          amount: sale.price,
          token,
        }),
      ];
    });

const claimRows = (world: DemoWorld, address: string): ActivityRow[] =>
  world.claims
    .filter((claim) => sameAddress(claim.claimant, address))
    .flatMap((claim) => {
      const tx = claimTx(world, claim.id);
      if (tx === null) return [];
      return [
        activityRow(world, {
          kind: claim.source === "REWARD" ? "claim" : "proceedsClaim",
          tx,
          at: claim.at,
          objectId: claim.id,
          amount: claim.amount,
          token: claim.token,
        }),
      ];
    });

const linkRows = (world: DemoWorld, address: string): ActivityRow[] =>
  world.nodes
    .filter((node) => sameAddress(node.owner, address))
    .map((node) =>
      activityRow(world, {
        kind: "linkCreated",
        tx: demoTx(`node:${node.id}`, node.createdAt),
        at: node.createdAt,
        objectId: node.id,
        amount: null,
        token: null,
      }),
    );

const statusKinds = {
  paused: "campaignPaused",
  resumed: "campaignResumed",
  ended: "campaignEnded",
};

const campaignRows = (world: DemoWorld, address: string): ActivityRow[] =>
  world.campaigns
    .filter((campaign) =>
      world.merchants.some(
        (merchant) => merchant.id === campaign.merchantId && sameAddress(merchant.address, address),
      ),
    )
    .flatMap((campaign) => [
      activityRow(world, {
        kind: "campaignCreated",
        tx: demoTx(`campaign:${campaign.id}:create`, campaign.createdAt),
        at: campaign.createdAt,
        objectId: campaign.id,
        amount: null,
        token: null,
      }),
      ...campaign.history.flatMap((event) =>
        event.kind === "activated"
          ? []
          : [
              activityRow(world, {
                kind: statusKinds[event.kind],
                tx: demoTx(`campaign:${campaign.id}:${event.kind}:${String(event.at)}`, event.at),
                at: event.at,
                objectId: campaign.id,
                amount: null,
                token: null,
              }),
            ],
      ),
      ...world.fundings
        .filter((funding) => funding.campaignId === campaign.id)
        .map((funding) =>
          activityRow(world, {
            kind: funding.kind === "deposited" ? "budgetFunded" : "budgetWithdrawn",
            tx: demoTx(`funding:${funding.id}`, funding.at),
            at: funding.at,
            objectId: campaign.id,
            amount: funding.amount,
            token: campaign.token,
          }),
        ),
    ]);

export const activityFor = (world: DemoWorld, address: string, extras: readonly ActivityRow[]) =>
  [
    ...purchaseRows(world, address),
    ...claimRows(world, address),
    ...linkRows(world, address),
    ...campaignRows(world, address),
    ...extras,
  ].sort((a, b) => b.at.localeCompare(a.at) || a.txHash.localeCompare(b.txHash));

const kindsFor = (filter: string | undefined): readonly string[] | null => {
  if (filter === undefined || filter === "all") return null;
  return (
    activityGroups[filter] ?? fail("VALIDATION_FAILED", `There's no "${filter}" activity filter.`)
  );
};

export const activityReads = {
  "account.activity": (input, runtime) => {
    const account = accountOf(runtime);
    const signer = signerOf(account).address;
    const address = input.address ?? signer;
    if (!findWallet(account, address))
      fail("NOT_AUTHORIZED", "That address isn't on your account.");
    const kinds = kindsFor(input.filter);
    const extras = sameAddress(address, signer) ? account.activity : [];
    const rows = activityFor(runtime.world, address, extras).filter(
      (row) => kinds === null || kinds.includes(row.kind),
    );
    return page(
      rows.map((row) => ({ ...row })),
      input,
    );
  },
  "account.balances": (input, runtime) => {
    const address = input.address ?? signerOf(accountOf(runtime)).address;
    const balance = balanceOf(runtime.world, address);
    return {
      monWei: balance.mon.toString(),
      sdusd: balance.sdusd.toString(),
      sdusdAllowanceToProtocol: balance.allowance.toString(),
      blockNumber: blockAt(runtime.now()),
    };
  },
} satisfies PartialHandlers<"account">;
