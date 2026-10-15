"use client";

import { isMeraError } from "@category-labs/mera";
import { useCallback, useEffect, useRef, useState } from "react";
import { storedPasskey } from "@/lib/accounts/passkey-credential";
import {
  decryptNote,
  encryptNote,
  encryptedNote,
  normalizeScope,
  type NoteScope,
} from "@/lib/campaign-notes/crypto";
import { readNote, saveNote } from "@/lib/campaign-notes/storage";
import { canSyncRevision, chooseNoteCopy } from "@/lib/campaign-notes/sync";
import { useSpokeClient } from "@/lib/client/provider";

const failureMessage = (error: unknown) => {
  if (isMeraError(error))
    return error.code === "PRF_UNAVAILABLE"
      ? "This passkey provider does not support encrypted notes. The original PRF-capable passkey is needed to open existing notes."
      : "The passkey confirmation did not finish. Your saved notes are unchanged. Try again.";
  if (error instanceof DOMException && error.name === "OperationError")
    return "These notes could not be decrypted. Keep your encrypted copies and try the original passkey.";
  return error instanceof Error ? error.message : "Could not open or save these notes. Try again.";
};
type OpenNote = {
  text: string;
  original: string;
  revision: string | null;
  remoteRevision: string | null;
  credentialId: string;
  offline: boolean;
};

export function useNotebook(scope: NoteScope) {
  const client = useSpokeClient();
  const [note, setNote] = useState<OpenNote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const epoch = useRef(0);
  const lock = useCallback(() => {
    epoch.current += 1;
    setNote(null);
    setBusy(false);
    setError(null);
    setMessage(null);
    setConflict(false);
  }, []);
  const open = async (preference?: "local" | "synced" | "offline") => {
    if (busy || !client) return;
    const attempt = ++epoch.current;
    setBusy(true);
    setError(null);
    setMessage(null);
    setConflict(false);
    try {
      const local = readNote(scope);
      const remote =
        preference === "offline"
          ? null
          : (
              await client.call("workspace.get", {
                chainId: scope.chainId,
                campaignId: scope.campaignId,
              })
            ).note;
      if (attempt !== epoch.current) return;
      const selected = chooseNoteCopy(local, remote, preference);
      if (selected.conflict) {
        setConflict(true);
        return;
      }
      const saved = selected.selected;
      if (preference === "offline" && !saved)
        throw new Error(
          "No saved copy exists in this browser. Reconnect to load your synced notes.",
        );
      const credentialId = saved?.credentialId ?? storedPasskey()?.credentialId;
      if (!credentialId) throw new Error("Sign in with your Spoke passkey again to start notes.");
      const text = saved ? await decryptNote(scope, saved) : "";
      if (attempt !== epoch.current) return;
      if (saved && local?.revision !== saved.revision)
        saveNote(scope, saved, local?.revision ?? null);
      setNote({
        text,
        original: text,
        revision: saved?.revision ?? null,
        remoteRevision: remote?.revision ?? null,
        credentialId,
        offline: preference === "offline",
      });
      setMessage(
        preference === "offline"
          ? "Local copy only. Saving here will not sync until you reconnect and reopen it."
          : local && !remote
            ? "Existing local notes preserved. Encrypt & sync uploads only ciphertext."
            : "Only this device can see the unlocked text.",
      );
    } catch (failure) {
      if (attempt === epoch.current) setError(failureMessage(failure));
    } finally {
      if (attempt === epoch.current) setBusy(false);
    }
  };
  const save = async () => {
    if (!note || busy || !client) return;
    const attempt = ++epoch.current;
    setBusy(true);
    setError(null);
    let locallySaved = false;
    try {
      const remote = note.offline
        ? null
        : (
            await client.call("workspace.get", {
              chainId: scope.chainId,
              campaignId: scope.campaignId,
            })
          ).note;
      if (
        !note.offline &&
        !canSyncRevision(remote?.revision ?? null, note.remoteRevision, note.revision)
      )
        throw new Error(
          "Notes changed on another device. Copy your edits, then lock and reopen to choose which version to use.",
        );
      const encrypted = await encryptNote(scope, { credentialId: note.credentialId }, note.text);
      if (attempt !== epoch.current) return;
      saveNote(scope, encrypted, note.revision);
      locallySaved = true;
      setNote({ ...note, revision: encrypted.revision });
      if (!note.offline)
        await client.call("workspace.save", {
          chainId: scope.chainId,
          campaignId: scope.campaignId,
          note: encrypted,
          expectedRevision: remote?.revision ?? null,
        });
      if (attempt !== epoch.current) return;
      lock();
      setMessage(
        note.offline
          ? "Encrypted and saved only in this browser. Reconnect to sync. Your notebook is locked."
          : "Encrypted and synced. Reopen with the same passkey on a supported device. Your notebook is locked.",
      );
    } catch (failure) {
      if (attempt === epoch.current)
        setError(
          `${failureMessage(failure)}${locallySaved ? " Your encrypted local copy is safe; sync has not been confirmed. Retry or download its backup before leaving." : ""}`,
        );
    } finally {
      if (attempt === epoch.current) setBusy(false);
    }
  };
  const downloadBackup = () => {
    try {
      const saved = readNote(scope);
      if (!saved) throw new Error("Save a note before downloading its encrypted backup.");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(saved)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `spoke-private-notes-${scope.campaignId}.json`;
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (failure) {
      setError(failureMessage(failure));
    }
  };
  const restoreBackup = async (file: File) => {
    if (busy || note) return;
    const attempt = ++epoch.current;
    setBusy(true);
    setError(null);
    try {
      if (file.size > 40_000)
        throw new Error("This file is larger than an encrypted Spoke notebook.");
      const backup = encryptedNote.parse(JSON.parse(await file.text()));
      if (JSON.stringify(normalizeScope(backup)) !== JSON.stringify(normalizeScope(scope)))
        throw new Error("Choose a backup for this account and campaign.");
      const current = readNote(scope);
      await decryptNote(scope, backup);
      if (attempt !== epoch.current) return;
      saveNote(scope, backup, current?.revision ?? null);
      setMessage(
        "Encrypted backup restored on this device. Open it to review and sync; the server copy has not changed.",
      );
      setConflict(false);
    } catch (failure) {
      if (attempt === epoch.current) setError(failureMessage(failure));
    } finally {
      if (attempt === epoch.current) setBusy(false);
    }
  };
  const opened = note !== null;
  useEffect(() => {
    if (!opened) return;
    const timeout = setTimeout(() => {
      lock();
      setMessage("Notebook locked after five minutes. Only saved changes were kept.");
    }, 5 * 60_000);
    return () => {
      clearTimeout(timeout);
    };
  }, [opened, lock]);
  useEffect(
    () => () => {
      epoch.current += 1;
    },
    [],
  );
  return {
    note,
    busy,
    error,
    message,
    conflict,
    open,
    save,
    lock,
    downloadBackup,
    restoreBackup,
    edit: (text: string) => {
      setNote((current) => (current ? { ...current, text } : null));
    },
  };
}
