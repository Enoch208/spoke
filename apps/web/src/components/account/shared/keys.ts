import { createSecp256k1SigningSession, type Secp256k1SigningSession } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import type { Address, Hex } from "viem";
import { readPasskeyEntropy } from "@/lib/accounts/passkey-entropy";
import type { SpokeClient } from "@/lib/client/types";

export type PhraseKey = {
  address: Address;
  sign: (message: string) => Promise<Hex>;
  end: () => void;
};

const sessionFromMnemonic = (mnemonic: string): Secp256k1SigningSession => {
  const seed = mnemonicToSeedSync(mnemonic);
  const master = HDKey.fromMasterSeed(seed);
  const node = master.derive("m/44'/60'/0'/0/0");
  const privateKey = node.privateKey;
  seed.fill(0);
  try {
    if (!privateKey) throw new Error("Unable to derive this account.");
    return createSecp256k1SigningSession({ privateKey });
  } finally {
    privateKey?.fill(0);
    node.wipePrivateData();
    master.wipePrivateData();
  }
};

export const keyFromMnemonic = (mnemonic: string): PhraseKey => {
  const session = sessionFromMnemonic(mnemonic);
  const account = toViemAccount(session);
  return {
    address: account.address,
    sign: (message) => account.signMessage({ message }),
    end: () => {
      session.end();
    },
  };
};

export const passkeyMnemonic = async (client?: SpokeClient | null): Promise<string> => {
  const { entropy } = await readPasskeyEntropy(client);
  try {
    return entropyToMnemonic(entropy, wordlist);
  } finally {
    entropy.fill(0);
  }
};

export const signWithPasskey = async (
  message: string,
  client?: SpokeClient | null,
): Promise<{ address: Address; signature: Hex }> => {
  const key = keyFromMnemonic(await passkeyMnemonic(client));
  try {
    return { address: key.address, signature: await key.sign(message) };
  } finally {
    key.end();
  }
};
