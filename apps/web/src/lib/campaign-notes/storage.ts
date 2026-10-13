import { encryptedNote, normalizeScope, type EncryptedNote, type NoteScope } from "./crypto";

export const noteStorageKey = (scope: NoteScope) => {
  const { address, chainId, campaignId } = normalizeScope(scope);
  return `spoke-campaign-notes:v1:${address}:${String(chainId)}:${campaignId}`;
};

export const readNote = (scope: NoteScope) => {
  const stored = localStorage.getItem(noteStorageKey(scope));
  if (stored === null) return null;
  const parsed = encryptedNote.parse(JSON.parse(stored));
  if (noteStorageKey(parsed) !== noteStorageKey(scope))
    throw new Error("This saved notebook does not match the campaign.");
  return parsed;
};

export const saveNote = (scope: NoteScope, note: EncryptedNote, previous: string | null) => {
  const parsed = encryptedNote.parse(note);
  if (noteStorageKey(parsed) !== noteStorageKey(scope))
    throw new Error("This notebook belongs to another campaign.");
  if ((readNote(scope)?.revision ?? null) !== previous)
    throw new Error("Notes changed in another tab. Copy your edits, then lock and reopen them.");
  localStorage.setItem(noteStorageKey(scope), JSON.stringify(parsed));
};
