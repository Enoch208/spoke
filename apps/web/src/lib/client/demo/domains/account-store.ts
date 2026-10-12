import { getAddress, type Address } from "viem";
import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { iso } from "../../../../demo/world/ids";
import type {
  DemoAccount,
  DemoBalance,
  DemoWorld,
  LinkedWallet,
} from "../../../../demo/world/world";
import { fail, found } from "../handler";

export const accountOf = (runtime: DemoRuntime): DemoAccount =>
  found(runtime.world.accounts[runtime.personaId()], "This persona's account");

export const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export const signerOf = (account: DemoAccount): LinkedWallet =>
  found(
    account.wallets.find((wallet) => wallet.isCurrentSigner),
    "The signed-in address",
  );

export const findWallet = (account: DemoAccount, address: string): LinkedWallet | undefined =>
  account.wallets.find((wallet) => sameAddress(wallet.address, address));

export const walletOf = (account: DemoAccount, address: string): LinkedWallet =>
  found(findWallet(account, address), "That address on your account");

export const balanceRow = (world: DemoWorld, address: string): DemoBalance => {
  const key: Address = getAddress(address);
  const existing = world.balances[key];
  if (existing) return existing;
  const created: DemoBalance = { mon: 0n, sdusd: 0n, sdeur: 0n, allowance: 0n };
  world.balances[key] = created;
  return created;
};

export const balanceOf = (world: DemoWorld, address: string): DemoBalance => {
  const row = world.balances[getAddress(address)];
  return row ? { ...row } : { mon: 0n, sdusd: 0n, sdeur: 0n, allowance: 0n };
};

export const requireStepUp = (token: string | undefined): void => {
  if (token === undefined || token.length < 32 || token.length > 128)
    fail("REAUTH_REQUIRED", "Confirm it's you to continue. Nothing changed.");
};

export const isoOrNull = (ms: number | null): string | null => (ms === null ? null : iso(ms));
