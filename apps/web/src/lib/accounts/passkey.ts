import { createSecp256k1SigningSession, type Secp256k1SigningSession } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { createWalletClient, http, type Address } from "viem";
import type { SpokeClient } from "../client/types";
import { readPasskeyEntropy } from "./passkey-entropy";
export { storedPasskey } from "./passkey-credential";
import { activeChain } from "../wagmi";
import { publicEnv } from "../public-env";
import type { SignerPort } from "../tx/ports";

let expiry: ReturnType<typeof setTimeout> | undefined;
let signing: {
  session: Secp256k1SigningSession;
  address: Address;
  startedAt: number;
  touchedAt: number;
} | null = null;

export const endPasskeySession = () => {
  clearTimeout(expiry);
  signing?.session.end();
  signing = null;
};

export const passkeySessionActive = () => {
  if (!signing) return false;
  if (
    Date.now() - signing.touchedAt >= 15 * 60_000 ||
    Date.now() - signing.startedAt >= 24 * 60 * 60_000
  ) {
    endPasskeySession();
    return false;
  }
  return true;
};

const scheduleExpiry = () => {
  clearTimeout(expiry);
  if (signing)
    expiry = setTimeout(
      endPasskeySession,
      Math.max(
        0,
        Math.min(signing.touchedAt + 15 * 60_000, signing.startedAt + 24 * 60 * 60_000) -
          Date.now(),
      ),
    );
};

const derive = (entropy: Uint8Array) => {
  const seed = mnemonicToSeedSync(entropyToMnemonic(entropy, wordlist));
  const master = HDKey.fromMasterSeed(seed);
  const node = master.derive("m/44'/60'/0'/0/0");
  const privateKey = node.privateKey;
  seed.fill(0);
  if (!privateKey) throw new Error("Unable to derive this account.");
  const session = createSecp256k1SigningSession({ privateKey });
  privateKey.fill(0);
  node.wipePrivateData();
  master.wipePrivateData();
  return session;
};

export const unlockPasskey = async (create = false, client?: SpokeClient | null) => {
  endPasskeySession();
  const { entropy, credential } = await readPasskeyEntropy(client, create);
  const session = (() => {
    try {
      return derive(entropy);
    } finally {
      entropy.fill(0);
    }
  })();
  const account = toViemAccount(session);
  signing = { session, address: account.address, startedAt: Date.now(), touchedAt: Date.now() };
  scheduleExpiry();
  return { account, credential };
};

export const passkeySigner = (address: Address): SignerPort => ({
  address,
  kind: "passkey",
  walletName: null,
  chainId: () => Promise.resolve(activeChain.id),
  send: async (request) => {
    if (
      !signing ||
      signing.address.toLowerCase() !== address.toLowerCase() ||
      !passkeySessionActive()
    )
      throw new Error("Confirm your passkey to continue.");
    const account = toViemAccount(signing.session);
    signing.touchedAt = Date.now();
    scheduleExpiry();
    const client = createWalletClient({
      account,
      chain: activeChain,
      transport: http(`${publicEnv.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/v1/rpc`),
    });
    const hash = await client.sendTransaction({
      to: request.to,
      data: request.data,
      value: request.value,
      gas: request.gas,
      maxFeePerGas: request.maxFeePerGas,
      maxPriorityFeePerGas: request.maxPriorityFeePerGas,
    });
    return { hash, nonce: null };
  },
});
