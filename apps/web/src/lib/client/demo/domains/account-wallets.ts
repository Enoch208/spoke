import { getAddress } from "viem";
import { iso } from "../../../../demo/world/ids";
import { payoutNotice, walletNotice } from "../../../../demo/world/seed-accounts-copy";
import type { DemoAccount, DemoWorld, LinkedWallet } from "../../../../demo/world/world";
import { fail, type DemoInput, type PartialHandlers } from "../handler";
import { personByAddress } from "../views/basics";
import { notify } from "./account-notify";
import { accountOf, findWallet, sameAddress, signerOf, walletOf } from "./account-store";

export const MAX_DERIVED_ADDRESSES = 5;
export const MAX_LINKED_ADDRESSES = 10;

const isDerived = (wallet: Pick<LinkedWallet, "kind">) => wallet.kind !== "wallet";

const named = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const belongsElsewhere = (world: DemoWorld, account: DemoAccount, address: string): boolean => {
  const person = personByAddress(world, address);
  if (person && person.id !== account.personId) return true;
  return Object.values(world.accounts).some(
    (other) => other.personId !== account.personId && findWallet(other, address) !== undefined,
  );
};

const nextIndex = (account: DemoAccount, wanted: number | undefined): number => {
  const used = new Set(account.wallets.filter(isDerived).map((wallet) => wallet.derivationIndex));
  if (wanted !== undefined) {
    if (used.has(wanted))
      fail("CONFLICT", `Passkey address #${String(wanted + 1)} is already on your account.`);
    return wanted;
  }
  const free = [0, 1, 2, 3, 4].find((index) => !used.has(index));
  return free ?? fail("VALIDATION_FAILED", "You can add up to 5 passkey addresses.");
};

const linked = (
  account: DemoAccount,
  input: DemoInput<"account.linkWallet">,
  now: number,
): LinkedWallet => {
  if (findWallet(account, input.address))
    fail(
      "CONFLICT",
      sameAddress(signerOf(account).address, input.address)
        ? "That's the address you're signed in with."
        : "That address is already on your account.",
    );
  if (account.wallets.length >= MAX_LINKED_ADDRESSES)
    fail("VALIDATION_FAILED", "You can link up to 10 addresses.");
  if (!isDerived(input))
    return {
      address: getAddress(input.address),
      kind: "wallet",
      derivationIndex: null,
      walletName: input.walletName ?? null,
      label: named(input.label) ?? named(input.walletName) ?? "Linked wallet",
      isPayout: false,
      isCurrentSigner: false,
      linkedAt: iso(now),
    };
  if (account.wallets.filter(isDerived).length >= MAX_DERIVED_ADDRESSES)
    fail("VALIDATION_FAILED", "You can add up to 5 passkey addresses.");
  const index = nextIndex(account, input.derivationIndex);
  return {
    address: getAddress(input.address),
    kind: input.kind,
    derivationIndex: index,
    walletName: null,
    label: named(input.label) ?? `Passkey account #${String(index + 1)}`,
    isPayout: false,
    isCurrentSigner: false,
    linkedAt: iso(now),
  };
};

export const walletReads = {
  "account.wallets": (_input, runtime) =>
    accountOf(runtime).wallets.map((wallet) => ({ ...wallet })),
} satisfies PartialHandlers<"account">;

export const walletWrites = {
  "account.linkWallet": (input, runtime) => {
    const account = accountOf(runtime);
    if (belongsElsewhere(runtime.world, account, input.address))
      fail(
        "WALLET_ALREADY_LINKED",
        "This wallet belongs to another Spoke account. Sign in with it and unlink it there, or delete that account first.",
      );
    const wallet = linked(account, input, runtime.now());
    account.wallets.push(wallet);
    notify(runtime, account.personId, walletNotice(wallet.address, "linked"));
    return { ...wallet };
  },
  "account.unlinkWallet": (input, runtime) => {
    const account = accountOf(runtime);
    const wallet = walletOf(account, input.address);
    if (wallet.isCurrentSigner)
      fail("NOT_AUTHORIZED", "That's the address you're signed in with, so it can't be unlinked.");
    if (wallet.isPayout)
      fail(
        "NOT_AUTHORIZED",
        "That's your payout address. Choose a different payout address first.",
      );
    account.wallets = account.wallets.filter((candidate) => candidate !== wallet);
    notify(runtime, account.personId, walletNotice(wallet.address, "unlinked"));
    return { ok: true };
  },
  "account.labelWallet": (input, runtime) => {
    const wallet = walletOf(accountOf(runtime), input.address);
    const label = input.label.trim();
    if (!label) fail("VALIDATION_FAILED", "Give the address a name.");
    wallet.label = label;
    return { ...wallet };
  },
  "account.setPayoutAddress": (input, runtime) => {
    const account = accountOf(runtime);
    const target = walletOf(account, input.address);
    if (target.isPayout) return { ...target };
    for (const wallet of account.wallets) wallet.isPayout = wallet === target;
    account.profile.payoutAddress = getAddress(target.address);
    notify(runtime, account.personId, payoutNotice(target.address));
    return { ...target };
  },
} satisfies PartialHandlers<"account">;
