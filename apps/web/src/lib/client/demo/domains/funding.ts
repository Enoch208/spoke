import { DAY, demoId, iso } from "../../../../demo/world/ids";
import { units } from "../../../../demo/world/catalog";
import { gasNotice, when } from "../../../../demo/world/seed-accounts-copy";
import { activityRow } from "../../../../demo/world/seed-accounts-history";
import { GAS_DRIP_WEI } from "../../../../demo/world/seed-accounts-parts";
import type { DemoAccount, DemoBalance, GasState } from "../../../../demo/world/world";
import { fail, type PartialHandlers } from "../handler";
import { DEMO_CHAIN_ID, blockAt, demoTx } from "../views/basics";
import { notify } from "./account-notify";
import { accountOf, balanceOf, balanceRow, signerOf } from "./account-store";

export const FAUCET_LIMIT = units(1000);
export const FEE_COVER_WEI = 50_000_000_000_000_000n;

const held: ReadonlySet<GasState["state"]> = new Set([
  "sending",
  "device_limit",
  "station_empty",
  "failed",
  "unavailable",
  "not_configured",
]);

const parsed = (value: string | null): number | null => (value === null ? null : Date.parse(value));

export const gasStateOf = (
  account: DemoAccount,
  balance: DemoBalance,
  now: number,
): GasState["state"] => {
  if (account.profile.accountKind === "wallet") return "wallet_account";
  if (held.has(account.gas.state)) return account.gas.state;
  const nextEligibleAt = parsed(account.gas.nextEligibleAt);
  if (nextEligibleAt !== null && now < nextEligibleAt)
    return account.gas.state === "received" ? "received" : "already_received";
  return balance.mon >= GAS_DRIP_WEI ? "balance_sufficient" : "eligible";
};

const refusal = (state: GasState["state"], nextEligibleAt: number | null): never => {
  if (state === "wallet_account")
    return fail(
      "NOT_ELIGIBLE",
      "The gas station tops up new passkey accounts. For a wallet, use the Monad faucet.",
    );
  if (state === "received" || state === "already_received")
    return fail(
      "GAS_ALREADY_RECEIVED",
      `You've already received test MON. Next request ${nextEligibleAt === null ? "tomorrow" : when(nextEligibleAt)}, or use the Monad faucet.`,
    );
  if (state === "balance_sufficient")
    return fail("NOT_ELIGIBLE", "You have enough testnet MON for network fees.");
  if (state === "station_empty")
    return fail(
      "GAS_STATION_EMPTY",
      "The gas station is out of test MON right now. Use the Monad faucet instead.",
    );
  if (state === "device_limit")
    return fail(
      "RATE_LIMITED",
      "This device already received test MON today. Use the Monad faucet instead.",
    );
  if (state === "sending") return fail("TX_PENDING", "Test MON is already on its way.");
  if (state === "not_configured")
    return fail(
      "FEATURE_NOT_AVAILABLE",
      "The gas drip isn't set up on this network. Use the Monad faucet.",
    );
  return fail(
    "UPSTREAM_UNAVAILABLE",
    "The gas drip isn't available right now. Use the Monad faucet instead.",
  );
};

export const fundingReads = {
  "funding.status": (input, runtime) => {
    const account = accountOf(runtime);
    const now = runtime.now();
    const balance = balanceOf(runtime.world, input.address ?? signerOf(account).address);
    const covered = balance.mon >= FEE_COVER_WEI;
    const nextEligibleAt = parsed(account.gas.nextEligibleAt);
    return {
      monWei: balance.mon.toString(),
      sdusd: balance.sdusd.toString(),
      sdusdAllowanceToProtocol: balance.allowance.toString(),
      blockNumber: blockAt(now),
      chainId: DEMO_CHAIN_ID,
      faucetLimit: FAUCET_LIMIT.toString(),
      covers: {
        createNode: covered,
        purchase: covered,
        finalizeSale: covered,
        claimRewards: covered,
      },
      gas: {
        ...account.gas,
        state: gasStateOf(account, balance, now),
        nextEligibleAt:
          nextEligibleAt !== null && nextEligibleAt > now ? iso(nextEligibleAt) : null,
      },
    };
  },
} satisfies PartialHandlers<"funding">;

export const fundingWrites = {
  "funding.requestGas": (_input, runtime) => {
    const account = accountOf(runtime);
    const signer = signerOf(account).address;
    const now = runtime.now();
    const state = gasStateOf(account, balanceOf(runtime.world, signer), now);
    if (state !== "eligible") return refusal(state, parsed(account.gas.nextEligibleAt));
    const n = runtime.nextId("gas");
    const label = `gas:${account.personId}:${String(n)}`;
    const tx = demoTx(label, now);
    balanceRow(runtime.world, signer).mon += GAS_DRIP_WEI;
    account.gas = {
      state: "received",
      dripAmount: GAS_DRIP_WEI.toString(),
      lastDripAt: iso(now),
      lastDripTxHash: tx.hash,
      nextEligibleAt: iso(now + DAY),
    };
    account.activity.push(
      activityRow(runtime.world, {
        kind: "gasDrip",
        tx,
        at: now,
        objectId: demoId("drip", n),
        amount: GAS_DRIP_WEI,
        token: null,
        status: "done",
      }),
    );
    notify(runtime, account.personId, gasNotice(GAS_DRIP_WEI));
    runtime.world.lastChainActionAt = now;
    return { txHash: tx.hash, amount: GAS_DRIP_WEI.toString() };
  },
} satisfies PartialHandlers<"funding">;
