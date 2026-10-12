import { DAY, HOUR, MINUTE } from "./ids";
import {
  MERCHANT_SAMPLE_WALLET,
  SHOWN_FIELDS,
  accountFor,
  addressAt,
  derivedAddress,
  exportJob,
  gas,
  passkey,
  preferences,
  profileOf,
  session,
  walletAddress,
} from "./seed-accounts-parts";
import type { DemoCore, DemoPerson } from "./types";
import type { DemoAccount } from "./world";

const owner = { payout: true, signer: true };

export const distributorAccount = (core: DemoCore, person: DemoPerson): DemoAccount => {
  const main = addressAt(person, 0);
  const a = core.anchor;
  return accountFor(person, {
    profile: profileOf(person, {
      intent: "earn",
      accountKind: "passkey",
      payoutAddress: main,
      recoveryCheckedAt: person.joinedAt + DAY,
      shownFields: SHOWN_FIELDS,
    }),
    passkeys: [
      passkey(
        "mara:original",
        "iCloud Keychain · iPhone",
        "original",
        "Safari on iPhone",
        person.joinedAt,
        a - 2 * HOUR,
      ),
      passkey(
        "mara:added",
        "1Password · Chrome on Windows",
        "added",
        "Chrome on Windows",
        a - 40 * DAY,
        a - 6 * DAY,
      ),
    ],
    wallets: [derivedAddress(main, 0, "Main", person.joinedAt, owner)],
    sessions: [
      session("mara-1", "This browser", "passkey", a - 2 * HOUR, a),
      session("mara-2", "Safari on iPhone", "passkey", a - 3 * DAY, a - 5 * HOUR),
      session("mara-3", "Chrome on Windows laptop", "passkey", a - 6 * DAY, a - 2 * DAY),
    ],
    preferences: preferences("earn", true),
    gas: gas("mara-2", "already_received", a - 6 * HOUR),
    exports: [exportJob("mara-1", a - 10 * DAY)],
  });
};

export const merchantAccount = (core: DemoCore, person: DemoPerson): DemoAccount => {
  const main = addressAt(person, 0);
  const business = addressAt(person, 1);
  const a = core.anchor;
  return accountFor(person, {
    profile: profileOf(person, {
      intent: "sell",
      accountKind: "passkey",
      payoutAddress: business,
      recoveryCheckedAt: person.joinedAt + 2 * DAY,
    }),
    passkeys: [
      passkey(
        "rhea:original",
        "iCloud Keychain · MacBook Pro",
        "original",
        "Safari on Mac",
        person.joinedAt,
        a - 4 * HOUR,
      ),
    ],
    wallets: [
      derivedAddress(main, 0, "Main", person.joinedAt, { signer: true }),
      derivedAddress(business, 1, "Business", person.joinedAt + HOUR, { payout: true }),
      walletAddress(MERCHANT_SAMPLE_WALLET, "Rabby", "Studio Rabby", a - 60 * DAY),
    ],
    sessions: [
      session("rhea-1", "This browser", "passkey", a - 4 * HOUR, a),
      session("rhea-2", "Safari on iPad", "passkey", a - 5 * DAY, a - DAY),
    ],
    preferences: preferences("sell", false),
    gas: gas("rhea-1", "eligible", person.joinedAt + 5 * MINUTE),
  });
};

export const buyerAccount = (core: DemoCore, person: DemoPerson): DemoAccount => {
  const main = addressAt(person, 0);
  const a = core.anchor;
  return accountFor(person, {
    profile: profileOf(person, {
      intent: "buy",
      accountKind: "wallet",
      payoutAddress: main,
      recoveryCheckedAt: null,
    }),
    passkeys: [],
    wallets: [walletAddress(main, "MetaMask", "MetaMask", person.joinedAt, owner)],
    sessions: [
      session("sam-1", "This browser", "wallet", a - HOUR, a),
      session("sam-2", "Chrome on Android", "wallet", a - 2 * DAY, a - 20 * HOUR),
    ],
    preferences: preferences("buy", false),
    gas: gas("sam", "wallet_account", null),
  });
};

export const operatorAccount = (core: DemoCore, person: DemoPerson): DemoAccount => {
  const main = addressAt(person, 0);
  return accountFor(person, {
    profile: profileOf(person, {
      intent: null,
      accountKind: "passkey",
      payoutAddress: main,
      recoveryCheckedAt: person.joinedAt + DAY,
      isOperator: true,
    }),
    passkeys: [
      passkey(
        "operator:original",
        "YubiKey 5C · USB-C",
        "original",
        "Security key",
        person.joinedAt,
        core.anchor - DAY,
      ),
    ],
    wallets: [derivedAddress(main, 0, "Main", person.joinedAt, owner)],
    sessions: [session("operator-1", "This browser", "passkey", core.anchor - DAY, core.anchor)],
    preferences: preferences("earn", true),
    gas: gas("operator", "eligible", null),
  });
};
