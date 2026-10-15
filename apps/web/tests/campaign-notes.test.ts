import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decryptNote,
  encryptNote,
  notesNamespace,
  notesPrfSalt,
} from "../src/lib/campaign-notes/crypto";
import { noteStorageKey, readNote, saveNote } from "../src/lib/campaign-notes/storage";

const ceremony = vi.hoisted(() => vi.fn());
vi.mock("@category-labs/mera", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  getPasskeyPrfOutput: ceremony,
}));
const credential = { credentialId: Buffer.from("spoke-notes-test-passkey").toString("base64url") };
const scope = { address: `0x${"a".repeat(40)}`, chainId: 10143, campaignId: "3" };
const storage = new Map<string, string>();
const outputs: Uint8Array[] = [];

beforeEach(() => {
  storage.clear();
  outputs.length = 0;
  vi.stubGlobal("location", { hostname: "localhost" });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
  ceremony.mockImplementation(() => {
    const prfOutput = new Uint8Array(32).fill(21);
    outputs.push(prfOutput);
    return Promise.resolve({ ...credential, prfOutput });
  });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("private campaign notes", () => {
  it("round trips encrypted text, stores no plaintext, and clears every PRF output", async () => {
    const text = "Share with the design community on Thursday. 🌱";
    const note = await encryptNote(scope, credential, text);
    saveNote(scope, note, null);
    const stored = readNote(scope);
    expect(stored).toEqual(note);
    expect(JSON.stringify([...storage.values()])).not.toContain(text);
    expect(await decryptNote(scope, note)).toBe(text);
    expect(outputs.every((output) => output.every((byte) => byte === 0))).toBe(true);
    expect(ceremony).toHaveBeenCalledWith({
      rpId: "localhost",
      credential,
      prfSalt: await notesPrfSalt(),
    });
  });

  it("decrypts a serialized synced envelope after local storage is cleared", async () => {
    const text = "Private partnership follow-up";
    const encrypted = await encryptNote(scope, credential, text);
    saveNote(scope, encrypted, null);
    const serverCopy = JSON.stringify(encrypted);
    storage.clear();
    expect(readNote(scope)).toBeNull();
    const restored = JSON.parse(serverCopy) as typeof encrypted;
    expect(await decryptNote(scope, restored)).toBe(text);
    saveNote(scope, restored, null);
    const local = readNote(scope);
    if (!local) throw new Error("Restored ciphertext was not saved.");
    expect(await decryptNote(scope, local)).toBe(text);
  });

  it("uses a distinct PRF namespace from Mera account entropy", async () => {
    const walletSalt = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mera.prf.salt.v1")),
    );
    expect(notesNamespace).toBe("spoke.campaign-notes.v1");
    expect(await notesPrfSalt()).not.toEqual(walletSalt);
  });

  it("generates fresh nonces and ciphertext on each save", async () => {
    const first = await encryptNote(scope, credential, "Same note");
    const second = await encryptNote(scope, credential, "Same note");
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.revision).not.toBe(second.revision);
  });

  it("rejects tampered ciphertext and a wrong PRF output", async () => {
    const note = await encryptNote(scope, credential, "Original");
    const bytes = Buffer.from(note.ciphertext, "base64url");
    bytes[0] = (bytes[0] ?? 0) ^ 255;
    await expect(
      decryptNote(scope, { ...note, ciphertext: bytes.toString("base64url") }),
    ).rejects.toThrow();
    ceremony.mockResolvedValue({ ...credential, prfOutput: new Uint8Array(32).fill(22) });
    await expect(decryptNote(scope, note)).rejects.toThrow();
  });

  it.each([
    { ...scope, campaignId: "4" },
    { ...scope, chainId: 143 },
    { ...scope, address: `0x${"b".repeat(40)}` },
  ])("binds ciphertext to the account, chain and campaign", async (other) => {
    const note = await encryptNote(scope, credential, "Private");
    await expect(decryptNote(other, note)).rejects.toThrow("different account or campaign");
    await expect(decryptNote(other, { ...note, ...other })).rejects.toThrow();
  });

  it("rejects a changed credential and clears its output", async () => {
    const prfOutput = new Uint8Array(32).fill(21);
    ceremony.mockResolvedValue({ credentialId: "another-passkey", prfOutput });
    await expect(encryptNote(scope, credential, "Private")).rejects.toThrow("Choose the passkey");
    expect(prfOutput.every((byte) => byte === 0)).toBe(true);
  });

  it("preserves a newer save when another editor submits an old revision", async () => {
    const initial = await encryptNote(scope, credential, "Initial");
    saveNote(scope, initial, null);
    const newer = await encryptNote(scope, credential, "Newer");
    saveNote(scope, newer, initial.revision);
    expect(() => {
      saveNote(scope, initial, initial.revision);
    }).toThrow("another tab");
    expect(readNote(scope)).toEqual(newer);
  });

  it("does not silently overwrite malformed saved data", async () => {
    storage.set(noteStorageKey(scope), "invalid-json");
    const note = await encryptNote(scope, credential, "New");
    expect(() => readNote(scope)).toThrow();
    expect(() => {
      saveNote(scope, note, null);
    }).toThrow();
    expect(storage.get(noteStorageKey(scope))).toBe("invalid-json");
  });

  it("rejects oversized notes before requesting the passkey", async () => {
    await expect(encryptNote(scope, credential, "x".repeat(6001))).rejects.toThrow();
    expect(ceremony).not.toHaveBeenCalled();
  });
});
