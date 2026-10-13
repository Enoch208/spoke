"use client";

import { isMeraError } from "@category-labs/mera";
import { useCallback, useEffect, useRef, useState } from "react";
import { storedPasskey } from "@/lib/accounts/passkey-credential";
import { decryptNote, encryptNote, type NoteScope } from "@/lib/campaign-notes/crypto";
import { readNote, saveNote } from "@/lib/campaign-notes/storage";

const failureMessage = (error: unknown) => {
  if (isMeraError(error))
    return error.code === "PRF_UNAVAILABLE"
      ? "This passkey provider does not support encrypted notes. Use a provider with PRF support."
      : "The passkey confirmation did not finish. Your saved notes are unchanged. Try again.";
  if (error instanceof DOMException && error.name === "OperationError")
    return "These notes could not be decrypted. Keep this browser’s saved data and try the original passkey.";
  return error instanceof Error ? error.message : "Could not open or save these notes. Try again.";
};

type OpenNote = { text: string; original: string; revision: string | null; credentialId: string };

export function useNotebook(scope: NoteScope) {
  const [note, setNote] = useState<OpenNote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const epoch = useRef(0);
  const lock = useCallback(() => {
    epoch.current += 1;
    setNote(null);
    setBusy(false);
    setError(null);
    setMessage(null);
  }, []);
  const open = async () => {
    if (busy) return;
    const attempt = ++epoch.current;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = readNote(scope);
      const credentialId = saved?.credentialId ?? storedPasskey()?.credentialId;
      if (!credentialId) throw new Error("Sign in with your Spoke passkey again to start notes.");
      const text = saved ? await decryptNote(scope, saved) : "";
      if (attempt === epoch.current)
        setNote({ text, original: text, revision: saved?.revision ?? null, credentialId });
    } catch (failure) {
      if (attempt === epoch.current) setError(failureMessage(failure));
    } finally {
      if (attempt === epoch.current) setBusy(false);
    }
  };
  const save = async () => {
    if (!note || busy) return;
    const attempt = ++epoch.current;
    setBusy(true);
    setError(null);
    try {
      const encrypted = await encryptNote(scope, { credentialId: note.credentialId }, note.text);
      if (attempt !== epoch.current) return;
      saveNote(scope, encrypted, note.revision);
      lock();
      setMessage("Encrypted and saved on this browser. Your notebook is locked.");
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
    open,
    save,
    lock,
    edit: (text: string) => {
      setNote((current) => (current ? { ...current, text } : null));
    },
  };
}
