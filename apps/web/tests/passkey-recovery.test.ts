import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientError } from "../src/lib/client/errors";
import { createLiveClient } from "../src/lib/client/live";
import { readPasskeyEntropy } from "../src/lib/accounts/passkey-entropy";
import { rememberPasskey } from "../src/lib/accounts/passkey-credential";
import { endPasskeySession, unlockPasskey } from "../src/lib/accounts/passkey";

const ceremonies = vi.hoisted(() => ({ create: vi.fn(), get: vi.fn(), decrypt: vi.fn() }));
vi.mock("../src/lib/public-env", () => ({
  publicEnv: { NEXT_PUBLIC_CHAIN_ID: 10143, NEXT_PUBLIC_API_URL: "https://example.test" },
}));
vi.mock("../src/lib/wagmi", async () => ({
  activeChain: (await import("@spoke/protocol")).monadTestnet,
}));
vi.mock("@category-labs/mera", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  createPasskeyWithPrfOutput: ceremonies.create,
  getPasskeyPrfOutput: ceremonies.get,
  decryptSecretVaultWithPasskey: ceremonies.decrypt,
}));

const credentialId = Buffer.from("spoke-test-credential").toString("base64url");
const vault = {
  version: 1,
  credential: { credentialId, transports: ["internal"] },
  prfSalt: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  nonce: "AAAAAAAAAAAAAAAA",
  ciphertext: "AAAAAAAAAAAAAAAAAAAAAA",
};
const storage = new Map<string, string>();
const client = createLiveClient({ apiUrl: "https://example.test" });

beforeEach(() => {
  vi.clearAllMocks();
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
  vi.stubGlobal("location", { hostname: "localhost" });
});
afterEach(() => {
  endPasskeySession();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const result = (entropy: Uint8Array) => ({
  credentialId,
  transports: ["internal"],
  prfOutput: entropy,
  prfSalt: new Uint8Array(32),
});

describe("recovering the same account with passkeys", () => {
  it("keeps original entropy separate from the wiped browser result", async () => {
    const source = new Uint8Array(32).fill(42);
    ceremonies.get.mockResolvedValue(result(source));
    vi.spyOn(client, "call").mockRejectedValue(
      new ClientError({ code: "NOT_FOUND", message: "No vault" }),
    );
    const read = await readPasskeyEntropy(client);
    expect(read.entropy).toEqual(new Uint8Array(32).fill(42));
    expect(source.every((value) => value === 0)).toBe(true);
    expect(read.credential.kind).toBe("original");
    expect(ceremonies.decrypt).not.toHaveBeenCalled();
  });

  it("opens a remembered added passkey's vault without deriving another account", async () => {
    rememberPasskey({ credentialId, transports: ["internal"], kind: "added" });
    vi.spyOn(client, "call").mockResolvedValue(vault);
    ceremonies.decrypt.mockResolvedValue(new Uint8Array(32).fill(42));
    const read = await readPasskeyEntropy(client);
    expect(read.entropy).toEqual(new Uint8Array(32).fill(42));
    expect(ceremonies.get).not.toHaveBeenCalled();
    expect(ceremonies.decrypt).toHaveBeenCalledWith({ rpId: "localhost", vault });
  });

  it("discovers an added passkey on a device without stored metadata", async () => {
    const unrelatedPrf = new Uint8Array(32).fill(7);
    ceremonies.get.mockResolvedValue(result(unrelatedPrf));
    ceremonies.decrypt.mockResolvedValue(new Uint8Array(32).fill(42));
    vi.spyOn(client, "call").mockResolvedValue(vault);
    const read = await readPasskeyEntropy(client);
    expect(read.entropy[0]).toBe(42);
    expect(read.credential.kind).toBe("added");
    expect(unrelatedPrf.every((value) => value === 0)).toBe(true);
  });

  it("stops on an API failure instead of silently opening an unrelated account", async () => {
    const source = new Uint8Array(32).fill(7);
    ceremonies.get.mockResolvedValue(result(source));
    vi.spyOn(client, "call").mockRejectedValue(
      new ClientError({ code: "API_UNREACHABLE", message: "Offline" }),
    );
    await expect(readPasskeyEntropy(client)).rejects.toThrow("Offline");
    expect(source.every((value) => value === 0)).toBe(true);
    expect(storage.size).toBe(0);
  });

  it("derives the same address from original and added credentials and wipes the decrypted copy", async () => {
    ceremonies.create.mockResolvedValue(result(new Uint8Array(32).fill(42)));
    const original = await unlockPasskey(true, client);
    const source = new Uint8Array(32).fill(42);
    rememberPasskey({ credentialId, transports: ["internal"], kind: "added" });
    vi.spyOn(client, "call").mockResolvedValue(vault);
    ceremonies.decrypt.mockResolvedValue(source);
    const added = await unlockPasskey(false, client);
    expect(added.account.address).toBe(original.account.address);
    expect(source.every((value) => value === 0)).toBe(true);
    expect(JSON.parse(storage.get("spoke-passkey") ?? "null")).toEqual({
      credentialId,
      transports: ["internal"],
      kind: "added",
    });
  });
});
