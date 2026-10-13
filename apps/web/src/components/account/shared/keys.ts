import {
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
  type Secp256k1SigningSession,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import type { Address, Hex } from "viem";
import { storedPasskey } from "@/lib/accounts/passkey";

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

export const passkeyMnemonic = async (): Promise<string> => {
  const known = storedPasskey();
  const result = await getPasskeyPrfOutput({
    rpId: location.hostname,
    ...(known ? { credential: known } : {}),
  });
  try {
    return entropyToMnemonic(result.prfOutput, wordlist);
  } finally {
    result.prfOutput.fill(0);
  }
};

export const signWithPasskey = async (
  message: string,
): Promise<{ address: Address; signature: Hex }> => {
  const key = keyFromMnemonic(await passkeyMnemonic());
  try {
    return { address: key.address, signature: await key.sign(message) };
  } finally {
    key.end();
  }
};
