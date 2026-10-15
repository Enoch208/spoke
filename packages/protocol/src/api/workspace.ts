import { z } from "zod";

export const notesNamespace = "spoke.campaign-notes.v1";
export const workspaceScope = z.object({
  chainId: z.number().int().positive(),
  campaignId: z
    .string()
    .regex(/^[1-9][0-9]*$/)
    .max(78),
});
export const noteScope = z.object({
  address: z.string().regex(/^0x[0-9a-f]{40}$/),
  ...workspaceScope.shape,
});
const encoded = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const encryptedNote = noteScope
  .extend({
    version: z.literal(1),
    namespace: z.literal(notesNamespace),
    credentialId: encoded.min(16).max(2048),
    revision: z.uuid(),
    savedAt: z.iso.datetime(),
    nonce: encoded.length(16),
    ciphertext: encoded.min(22).max(33000),
  })
  .strict();
export const workspaceNote = z.object({
  note: encryptedNote.nullable(),
  updatedAt: z.iso.datetime().nullable(),
});
export const workspaceWrite = workspaceScope
  .extend({
    note: encryptedNote,
    expectedRevision: z.uuid().nullable(),
  })
  .strict();
export const workspaceIndex = z.object({
  items: z.array(noteScope.extend({ updatedAt: z.iso.datetime() })).max(100),
  maxNotes: z.literal(100),
});
