"use client";

import { decryptSecretVaultWithPasskey, parseSecretVault } from "@category-labs/mera";
import { entropyToMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import type { SpokeClient } from "@/lib/client/types";
import { keyFromMnemonic, passkeyMnemonic } from "../shared/keys";
import { CeremonyError } from "../shared/outcome";
import { samplePhrase } from "../shared/phrase";

export class DifferentAccountError extends Error {
  readonly address: string;
  constructor(address: string) {
    super("different account");
    this.address = address;
  }
}

export class VaultError extends Error {}

const vaultMnemonic = async (client: SpokeClient, credentialId: string) => {
  const raw = await client.call("account.passkeyVault", { credentialId }).catch(() => {
    throw new VaultError("vault");
  });
  const vault = parseSecretVault(raw);
  const secret = await decryptSecretVaultWithPasskey({ rpId: location.hostname, vault });
  try {
    return entropyToMnemonic(secret, wordlist);
  } finally {
    secret.fill(0);
  }
};

export const unlockWords = async ({
  demo,
  client,
  signedIn,
  addedCredential,
  simulate,
}: {
  demo: boolean;
  client: SpokeClient | null;
  signedIn: string;
  addedCredential: string | null;
  simulate: () => Promise<void>;
}): Promise<string[]> => {
  if (demo) {
    await simulate();
    return [...samplePhrase];
  }
  if (!client) throw new CeremonyError("failed");
  const mnemonic = addedCredential
    ? await vaultMnemonic(client, addedCredential)
    : await passkeyMnemonic(client);
  const key = keyFromMnemonic(mnemonic);
  const address = key.address;
  key.end();
  if (address.toLowerCase() !== signedIn.toLowerCase()) throw new DifferentAccountError(address);
  return mnemonic.split(" ");
};
