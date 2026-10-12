import type { Address } from "viem";
import { units } from "./catalog";
import { DAY, MINUTE, demoId } from "./ids";
import {
  exportNotice,
  gasNotice,
  passkeyNotice,
  seededReadAt,
  signInNotice,
  toNotification,
  walletNotice,
  type NoticeSpec,
} from "./seed-accounts-copy";
import { seededHistory, seededSupport } from "./seed-accounts-history";
import { merchantNotices } from "./seed-accounts-merchant";
import { distributorInvites, linkOwnerNotices } from "./seed-accounts-notices";
import { GAS_DRIP_WEI, MERCHANT_SAMPLE_WALLET, addressAt } from "./seed-accounts-parts";
import {
  buyerAccount,
  distributorAccount,
  merchantAccount,
  operatorAccount,
} from "./seed-accounts-people";
import { purchaseNotices } from "./seed-accounts-purchases";
import type { DemoCore, DemoId, DemoPerson } from "./types";
import type { DemoAccount, DemoBalance, DemoWorld } from "./world";

const RETENTION = 90 * DAY;
const UNREAD_WINDOW = 2 * DAY;

const mon = (hundredths: number): bigint => BigInt(hundredths) * 10n ** 16n;

const personOf = (core: DemoCore, id: DemoId): DemoPerson => {
  const person = core.people.find((candidate) => candidate.id === id);
  if (!person) throw new RangeError(`The sample world has no ${id}.`);
  return person;
};

const accountNotices = (account: DemoAccount): NoticeSpec[] => {
  const signIns = account.sessions
    .filter((session) => !session.isCurrent)
    .map((session) => ({ ...signInNotice(session), at: Date.parse(session.signedInAt) }));
  const passkeys = account.passkeys
    .filter((passkey) => passkey.kind === "added")
    .map((passkey) => {
      const at = Date.parse(passkey.createdAt);
      return { ...passkeyNotice(passkey.label, "added", at), at };
    });
  const wallets = account.wallets
    .filter((wallet) => wallet.kind === "wallet" && !wallet.isCurrentSigner)
    .map((wallet) => ({
      ...walletNotice(wallet.address, "linked"),
      at: Date.parse(wallet.linkedAt),
    }));
  const drip =
    account.gas.lastDripAt === null
      ? []
      : [{ ...gasNotice(GAS_DRIP_WEI), at: Date.parse(account.gas.lastDripAt) }];
  const exports = account.exports.flatMap((job) => {
    if (job.expiresAt === undefined) return [];
    const expiresAt = Date.parse(job.expiresAt);
    return [{ ...exportNotice(expiresAt), at: expiresAt - 15 * MINUTE }];
  });
  return [...signIns, ...passkeys, ...wallets, ...drip, ...exports];
};

const noticesOf = (core: DemoCore, person: DemoPerson, account: DemoAccount): NoticeSpec[] => {
  const main = addressAt(person, 0);
  const own = accountNotices(account);
  if (person.id === core.personas.distributor)
    return [...linkOwnerNotices(core, main), ...distributorInvites(core), ...own];
  if (person.id === core.personas.merchant) return [...merchantNotices(core, person.id), ...own];
  if (person.id === core.personas.buyer)
    return [...purchaseNotices(core, main), ...linkOwnerNotices(core, main), ...own];
  return own;
};

const withHistory = (core: DemoCore, person: DemoPerson, account: DemoAccount): DemoAccount => {
  const key = person.id.replace(/^demo-/, "");
  const notifications = noticesOf(core, person, account)
    .filter((spec) => spec.at <= core.anchor && spec.at > core.anchor - RETENTION)
    .sort((a, b) => b.at - a.at)
    .map((spec, index) =>
      toNotification(
        demoId("ntf", `${key}-${String(index + 1)}`),
        spec,
        seededReadAt(spec.at, core.anchor, UNREAD_WINDOW),
      ),
    );
  return {
    ...account,
    notifications,
    activity: seededHistory(core, person),
    support: seededSupport(core, person),
  };
};

const balance = (mon: bigint, sdusd: bigint, sdeur = 0n, allowance = 0n): DemoBalance => ({
  mon,
  sdusd,
  sdeur,
  allowance,
});

const seedBalances = (core: DemoCore): Record<Address, DemoBalance> => {
  const balances: Record<Address, DemoBalance> = {};
  for (const person of core.people)
    for (const address of person.addresses) balances[address] = balance(0n, 0n);
  const merchant = personOf(core, core.personas.merchant);
  balances[addressAt(merchant, 0)] = balance(mon(2), units(48, 20));
  balances[addressAt(merchant, 1)] = balance(mon(80), units(1240), 0n, units(500));
  balances[MERCHANT_SAMPLE_WALLET] = balance(mon(15), units(20));
  balances[addressAt(personOf(core, core.personas.distributor), 0)] = balance(
    mon(35),
    units(85, 50),
    units(4),
  );
  balances[addressAt(personOf(core, core.personas.buyer), 0)] = balance(mon(50), units(160));
  return balances;
};

export const seedAccounts = (core: DemoCore): Pick<DemoWorld, "accounts" | "balances"> => {
  const builders: [DemoId, (core: DemoCore, person: DemoPerson) => DemoAccount][] = [
    [core.personas.merchant, merchantAccount],
    [core.personas.distributor, distributorAccount],
    [core.personas.buyer, buyerAccount],
    [core.operatorId, operatorAccount],
  ];
  const accounts: Record<DemoId, DemoAccount> = {};
  for (const [id, build] of builders) {
    const person = personOf(core, id);
    accounts[id] = withHistory(core, person, build(core, person));
  }
  return { accounts, balances: seedBalances(core) };
};
