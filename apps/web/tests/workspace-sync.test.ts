import { describe, expect, it } from "vitest";
import { chooseNoteCopy, canSyncRevision } from "../src/lib/campaign-notes/sync";
import { encryptedNote } from "../src/lib/campaign-notes/crypto";
const note = encryptedNote.parse({
  address: `0x${"a".repeat(40)}`,
  chainId: 10143,
  campaignId: "1",
  version: 1,
  namespace: "spoke.campaign-notes.v1",
  credentialId: "test-passkey-original",
  revision: "00000000-0000-4000-8000-000000000001",
  savedAt: "2026-10-15T00:00:00Z",
  nonce: "AAAAAAAAAAAAAAAA",
  ciphertext: "AAAAAAAAAAAAAAAAAAAAAA",
});
describe("private notebook copy selection", () => {
  it("preserves legacy local notes and restores remote notes after browser storage loss", () => {
    expect(chooseNoteCopy(note, null).selected).toEqual(note);
    expect(chooseNoteCopy(null, note).selected).toEqual(note);
  });
  it("never silently chooses between divergent device copies", () => {
    const remote = { ...note, revision: "00000000-0000-4000-8000-000000000002" };
    expect(chooseNoteCopy(note, remote).conflict).toBe(true);
    expect(chooseNoteCopy(note, remote, "local").selected).toEqual(note);
    expect(chooseNoteCopy(note, remote, "synced").selected).toEqual(remote);
  });
  it("refuses modified ciphertext under the same revision", () => {
    expect(() => chooseNoteCopy(note, { ...note, ciphertext: "BBBBBBBBBBBBBBBBBBBBBB" })).toThrow(
      "differs",
    );
  });
  it("permits a lost-response retry only when the server has the opened or locally saved revision", () => {
    expect(canSyncRevision("opened", "opened", "local")).toBe(true);
    expect(canSyncRevision("local", "opened", "local")).toBe(true);
    expect(canSyncRevision("another-device", "opened", "local")).toBe(false);
  });
});
