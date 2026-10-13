"use client";

import type { ClientInput, ClientOutput } from "@spoke/protocol";
import { useCallback, useEffect, useRef, useState } from "react";
import { isClientError } from "@/lib/client/errors";
import { useSpokeClient } from "@/lib/client/provider";

export type Draft = ClientOutput<"campaigns.getDraft">;
export type DraftInput = ClientInput<"campaigns.saveDraft">["draft"];
export type SaveStatus = "idle" | "saving" | "saved" | "failed" | "offline" | "conflict";
export type DraftRequest = {
  readonly key: string;
  readonly endKey: string;
  readonly build: (version: number, keepEndsAt: string | null) => DraftInput;
};

const debounceMs = 800;
const maxBackoffMs = 30_000;

export function useDraftSave({
  draftId,
  initial,
  request,
  onSaved,
}: {
  draftId: string;
  initial: Draft | null;
  request: DraftRequest | null;
  onSaved: (draft: Draft) => void;
}) {
  const client = useSpokeClient();
  const [status, setStatus] = useState<SaveStatus>(initial ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState<string | null>(initial?.savedAt ?? null);
  const [version, setVersion] = useState(initial?.version ?? 0);
  const requestRef = useRef(request);
  const onSavedRef = useRef(onSaved);
  const versionRef = useRef(initial?.version ?? 0);
  const lastRef = useRef<Draft | null>(initial);
  const lastEndKey = useRef<string | null>(null);
  const savedKeyRef = useRef<string | null | undefined>(undefined);
  const inFlight = useRef<Promise<Draft | null> | null>(null);
  const attempts = useRef(0);
  const retryTimer = useRef<number | null>(null);
  const flushRef = useRef<(() => Promise<Draft | null>) | null>(null);

  useEffect(() => {
    requestRef.current = request;
    onSavedRef.current = onSaved;
  });

  const flush = useCallback(async (): Promise<Draft | null> => {
    while (inFlight.current) await inFlight.current;
    const current = requestRef.current;
    if (!client || !current) return null;
    if (current.key === savedKeyRef.current && lastRef.current) return lastRef.current;
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    setStatus("saving");
    const run = client
      .call("campaigns.saveDraft", {
        id: draftId,
        draft: current.build(
          versionRef.current,
          lastRef.current && lastEndKey.current === current.endKey ? lastRef.current.endsAt : null,
        ),
      })
      .then((draft) => {
        lastEndKey.current = current.endKey;
        versionRef.current = draft.version;
        lastRef.current = draft;
        savedKeyRef.current = current.key;
        attempts.current = 0;
        setStatus("saved");
        setSavedAt(draft.savedAt);
        setVersion(draft.version);
        onSavedRef.current(draft);
        return draft;
      })
      .catch((error: unknown) => {
        if (isClientError(error) && error.code === "CONFLICT") {
          setStatus("conflict");
          return null;
        }
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        setStatus(offline ? "offline" : "failed");
        attempts.current += 1;
        const wait = Math.min(maxBackoffMs, 1000 * 2 ** attempts.current);
        retryTimer.current = window.setTimeout(() => void flushRef.current?.(), wait);
        return null;
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    return run;
  }, [client, draftId]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const key = request?.key ?? null;
  useEffect(() => {
    if (key === null) return;
    if (savedKeyRef.current === undefined) {
      savedKeyRef.current = initial ? key : null;
      if (initial) return;
    }
    if (key === savedKeyRef.current) return;
    const timer = window.setTimeout(() => void flush(), debounceMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [key, initial, flush]);

  const isDirty = useCallback(
    () =>
      requestRef.current !== null &&
      (requestRef.current.key !== savedKeyRef.current || inFlight.current !== null),
    [],
  );

  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (isDirty()) event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => {
      window.removeEventListener("beforeunload", guard);
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    };
  }, [isDirty]);

  return { status, savedAt, version, saveNow: flush, isDirty };
}
