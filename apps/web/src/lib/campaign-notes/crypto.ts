import { getPasskeyPrfOutput, type PasskeyCredentialMetadata } from "@category-labs/mera";
import { z } from "zod";

export const notesNamespace = "spoke.campaign-notes.v1";
export const noteText = z.string().max(6000);
export type NoteScope = { address: string; chainId: number; campaignId: string };

const scopeSchema = z.object({
  address: z.string().regex(/^0x[0-9a-f]{40}$/),
  chainId: z.number().int().positive(),
  campaignId: z.string().regex(/^[1-9][0-9]*$/),
});
const encoded = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const encryptedNote = scopeSchema.extend({
  version: z.literal(1),
  namespace: z.literal(notesNamespace),
  credentialId: encoded.min(16).max(2048),
  revision: z.uuid(),
  savedAt: z.iso.datetime(),
  nonce: encoded.length(16),
  ciphertext: encoded.min(22).max(33000),
});
export type EncryptedNote = z.infer<typeof encryptedNote>;
const utf8 = new TextEncoder();
export const normalizeScope = (scope: NoteScope) =>
  scopeSchema.parse({ ...scope, address: scope.address.toLowerCase() });
const context = (scope: NoteScope, credentialId: string) =>
  utf8.encode(
    JSON.stringify({ namespace: notesNamespace, ...normalizeScope(scope), credentialId }),
  );
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
const decode = (value: string) =>
  Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (char) =>
    char.charCodeAt(0),
  );

export const notesPrfSalt = async () =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", utf8.encode(notesNamespace)));

const noteKey = async (scope: NoteScope, credential: PasskeyCredentialMetadata) => {
  const result = await getPasskeyPrfOutput({
    rpId: location.hostname,
    credential,
    prfSalt: await notesPrfSalt(),
  });
  try {
    if (result.credentialId !== credential.credentialId)
      throw new Error("Choose the passkey that protects this notebook.");
    const material = await crypto.subtle.importKey("raw", result.prfOutput, "HKDF", false, [
      "deriveKey",
    ]);
    return await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: context(scope, credential.credentialId),
        info: utf8.encode(`${notesNamespace}.encryption`),
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } finally {
    result.prfOutput.fill(0);
  }
};

export const encryptNote = async (
  scope: NoteScope,
  credential: PasskeyCredentialMetadata,
  text: string,
): Promise<EncryptedNote> => {
  const secret = utf8.encode(noteText.parse(text));
  try {
    const key = await noteKey(scope, credential);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: context(scope, credential.credentialId) },
      key,
      secret,
    );
    return encryptedNote.parse({
      ...normalizeScope(scope),
      version: 1,
      namespace: notesNamespace,
      credentialId: credential.credentialId,
      revision: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      nonce: encode(nonce),
      ciphertext: encode(new Uint8Array(ciphertext)),
    });
  } finally {
    secret.fill(0);
  }
};

export const decryptNote = async (scope: NoteScope, input: EncryptedNote) => {
  const note = encryptedNote.parse(input);
  if (JSON.stringify(normalizeScope(scope)) !== JSON.stringify(normalizeScope(note)))
    throw new Error("This notebook belongs to a different account or campaign.");
  const key = await noteKey(scope, { credentialId: note.credentialId });
  const decrypted = new Uint8Array(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decode(note.nonce),
        additionalData: context(scope, note.credentialId),
      },
      key,
      decode(note.ciphertext),
    ),
  );
  try {
    return noteText.parse(new TextDecoder("utf-8", { fatal: true }).decode(decrypted));
  } finally {
    decrypted.fill(0);
  }
};
