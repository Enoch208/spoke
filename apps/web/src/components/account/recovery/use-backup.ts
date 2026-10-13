"use client";

import { useEffect, useRef, useState } from "react";
import { useClientContext } from "@/lib/client/provider";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { recoveryCopy } from "../copy/recovery";
import { ceremonyFailure } from "../shared/outcome";
import { checkPositions, wordMatches } from "../shared/phrase";
import { useSimulatedPrompt } from "../shared/simulated-prompt";
import { DifferentAccountError, unlockWords, VaultError } from "./unlock-words";

export type BackupMode = "backup" | "check" | "reveal";
export type BackupStep = "why" | "write" | "check" | "skip" | "done";
export type BackupFailure =
  | { kind: "cancelled" | "prf" | "crypto" | "failed" | "vault" | "record" }
  | { kind: "differentAccount"; address: string };

export type FieldError = "empty" | "miss" | null;

const idleMs = 120_000;

export function useBackup({
  mode,
  credentialId,
  onRecorded,
  persist = true,
}: {
  mode: BackupMode;
  credentialId?: string | undefined;
  onRecorded?: (() => void) | undefined;
  persist?: boolean;
}) {
  const { client, mode: appMode } = useClientContext();
  const me = useClientQuery("account.me", {});
  const passkeys = useClientQuery("account.passkeys", {}, { enabled: Boolean(credentialId) });
  const record = useClientMutation("account.recordRecoveryCheck", ["account.me"]);
  const simulated = useSimulatedPrompt();
  const [step, setStep] = useState<BackupStep>(mode === "check" ? "check" : "why");
  const [words, setWords] = useState<readonly string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<BackupFailure | null>(null);
  const [positions, setPositions] = useState<readonly number[]>(() => checkPositions());
  const [typed, setTyped] = useState<readonly string[]>(["", "", ""]);
  const [fieldErrors, setFieldErrors] = useState<readonly FieldError[]>([null, null, null]);
  const [attempts, setAttempts] = useState(0);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const added = passkeys.data?.find(
    (passkey) => passkey.credentialId === credentialId && passkey.kind === "added",
  );

  const wipe = () => {
    setWords([]);
    setRevealed(false);
  };

  useEffect(() => {
    if (!revealed) return;
    const hide = () => {
      setRevealed(false);
    };
    const touch = () => {
      clearTimeout(idle.current);
      idle.current = setTimeout(hide, idleMs);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hide();
    };
    touch();
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(idle.current);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [revealed]);

  useEffect(
    () => () => {
      clearTimeout(idle.current);
    },
    [],
  );

  const unlock = async () => {
    if (words.length > 0) return words;
    const unlocked = await unlockWords({
      demo: appMode === "demo",
      client,
      signedIn: me.data?.address ?? "",
      addedCredential: added ? added.credentialId : null,
      simulate: () => simulated.ask("passkey"),
    });
    setWords(unlocked);
    return unlocked;
  };

  const fail = (error: unknown) => {
    if (error instanceof DifferentAccountError)
      setFailure({ kind: "differentAccount", address: error.address });
    else if (error instanceof VaultError) setFailure({ kind: "vault" });
    else setFailure({ kind: ceremonyFailure(error) });
  };

  const showPhrase = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await unlock();
      setStep("write");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const recordCheck = async () => {
    setBusy(true);
    setFailure(null);
    try {
      if (persist) await record.mutateAsync({});
      wipe();
      useUiStore.getState().pushToast({
        id: "T-38",
        tone: "success",
        message: recoveryCopy.toast,
        durationMs: 4000,
      });
      setStep("done");
      onRecorded?.();
    } catch {
      setFailure({ kind: "record" });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (failure?.kind === "record") return recordCheck();
    setFailure(null);
    const empties = typed.map((value): FieldError => (value.trim() === "" ? "empty" : null));
    if (empties.some(Boolean)) {
      setFieldErrors(empties);
      return;
    }
    setBusy(true);
    const source = await unlock().catch((error: unknown) => {
      fail(error);
      return null;
    });
    setBusy(false);
    if (!source) return;
    const misses = typed.map((value, index): FieldError =>
      wordMatches(value, source[positions[index] ?? -1]) ? null : "miss",
    );
    if (misses.some(Boolean)) {
      setFieldErrors(misses);
      setAttempts((count) => count + 1);
      return;
    }
    await recordCheck();
  };

  const restartCheck = () => {
    setPositions(checkPositions());
    setTyped(["", "", ""]);
    setFieldErrors([null, null, null]);
    setAttempts(0);
  };

  return {
    me: me.data ?? null,
    step,
    setStep,
    words,
    revealed,
    seen,
    setRevealed: (next: boolean) => {
      if (next) setSeen(true);
      setRevealed(next);
    },
    busy,
    failure,
    positions,
    typed,
    setTyped: (index: number, value: string) => {
      setTyped((current) => current.map((word, position) => (position === index ? value : word)));
      setFieldErrors((current) =>
        current.map((error, position) => (position === index ? null : error)),
      );
    },
    fieldErrors,
    attempts,
    showPhrase,
    confirm,
    restartCheck,
    wipe,
    prompt: simulated.element,
    demo: appMode === "demo",
  };
}

export type Backup = ReturnType<typeof useBackup>;
