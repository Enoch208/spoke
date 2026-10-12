import { iso, sampleHash } from "../../../../demo/world/ids";
import { passkeyNotice } from "../../../../demo/world/seed-accounts-copy";
import type { DemoAccount, Passkey } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { notify } from "./account-notify";
import { accountOf, requireStepUp } from "./account-store";

const passkeyOf = (account: DemoAccount, credentialId: string): Passkey =>
  found(
    account.passkeys.find((passkey) => passkey.credentialId === credentialId),
    "That passkey",
  );

export const sampleVault = (credentialId: string) => ({
  demo: true,
  ciphertext: sampleHash(`vault:${credentialId}`),
});

export const keyReads = {
  "account.passkeys": (_input, runtime) =>
    accountOf(runtime).passkeys.map((passkey) => ({ ...passkey })),
  "account.passkeyVault": (input, runtime) => {
    const owner = Object.values(runtime.world.accounts).find((account) =>
      account.passkeys.some(
        (passkey) =>
          passkey.credentialId === input.credentialId &&
          passkey.kind === "added" &&
          passkey.hasVault,
      ),
    );
    if (!owner)
      fail("NOT_FOUND", "This passkey's encrypted copy is missing. Remove it and add it again.");
    return sampleVault(input.credentialId);
  },
} satisfies PartialHandlers<"account">;

export const keyWrites = {
  "account.addPasskey": (input, runtime) => {
    const account = accountOf(runtime);
    if (account.profile.accountKind === "wallet")
      fail("NOT_ELIGIBLE", "You sign in with a wallet. Add a passkey account in Wallets instead.");
    if (account.passkeys.some((passkey) => passkey.credentialId === input.credentialId))
      fail("CONFLICT", "That passkey is already on your account.");
    if (input.kind === "original")
      fail("CONFLICT", "This account already has its original passkey.");
    requireStepUp(input.confirmationToken);
    if (input.vault === undefined)
      fail("VALIDATION_FAILED", "An added passkey needs its encrypted copy of your phrase.");
    const now = runtime.now();
    const passkey: Passkey = {
      credentialId: input.credentialId,
      label: input.label,
      kind: "added",
      deviceHint: input.label,
      createdAt: iso(now),
      lastUsedAt: null,
      hasVault: true,
    };
    account.passkeys.push(passkey);
    notify(runtime, account.personId, passkeyNotice(passkey.label, "added", now));
    return { ...passkey };
  },
  "account.updatePasskey": (input, runtime) => {
    const passkey = passkeyOf(accountOf(runtime), input.credentialId);
    const label = input.label.trim();
    if (!label) fail("VALIDATION_FAILED", "Give the passkey a name.");
    passkey.label = label;
    return { ...passkey };
  },
  "account.removePasskey": (input, runtime) => {
    const account = accountOf(runtime);
    const passkey = passkeyOf(account, input.credentialId);
    if (passkey.kind === "original")
      fail(
        "NOT_AUTHORIZED",
        "The original passkey creates this account's key directly, so Spoke doesn't remove it.",
      );
    account.passkeys = account.passkeys.filter((candidate) => candidate !== passkey);
    notify(runtime, account.personId, passkeyNotice(passkey.label, "removed", runtime.now()));
    return { ok: true };
  },
} satisfies PartialHandlers<"account">;
