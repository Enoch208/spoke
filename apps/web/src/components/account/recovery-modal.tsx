"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { revealRecoveryPhrase } from "@/lib/accounts/passkey";
import { useSpokeClient } from "@/lib/client/provider";
import { useModeStore } from "@/lib/stores/mode";
import type { ModalComponentProps } from "@/components/app/modal-types";

const sample =
  "sample demo words are displayed here only to explain the backup process never use these words as a recovery phrase for any real account"
    .split(" ")
    .slice(0, 24);

export default function RecoveryModal({ props, close }: ModalComponentProps<"M-04">) {
  const mode = useModeStore((state) => state.mode);
  const client = useSpokeClient();
  const [phrase, setPhrase] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reveal = async () => {
    setBusy(true);
    setError(null);
    try {
      setPhrase(mode === "demo" ? sample : (await revealRecoveryPhrase()).split(" "));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Your recovery phrase could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    if (first.trim().toLowerCase() !== phrase[0] || last.trim().toLowerCase() !== phrase[23]) {
      setError("Those words do not match. Check your written backup.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await client?.call("account.recordRecoveryCheck", {});
      setPhrase([]);
      close();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to save your backup check. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setPhrase([]);
          close();
        }
      }}
      title="Back up your recovery phrase"
      subtitle={
        mode === "demo"
          ? "Sample phrase · demo"
          : "Keep these words offline. Anyone with them can control your account."
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {props.origin === "onboarding" ? "Skip for now" : "Remind me later"}
          </Button>
          {phrase.length ? (
            <Button
              loading={busy}
              onClick={() => {
                if (check) void finish();
                else setCheck(true);
              }}
            >
              {check ? "Confirm backup" : "I wrote it down"}
            </Button>
          ) : (
            <Button loading={busy} onClick={() => void reveal()}>
              Reveal with passkey
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p>
          Your passkey stays with your provider. These 24 words recover the same account in a
          compatible wallet if you lose access to the passkey.
        </p>
        {check ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Word 1">
              <Input
                autoComplete="off"
                value={first}
                onChange={(event) => {
                  setFirst(event.target.value);
                }}
              />
            </Field>
            <Field label="Word 24">
              <Input
                autoComplete="off"
                value={last}
                onChange={(event) => {
                  setLast(event.target.value);
                }}
              />
            </Field>
          </div>
        ) : phrase.length ? (
          <ol className="bg-soft grid grid-cols-2 gap-2 rounded-xl p-4 font-mono text-sm sm:grid-cols-4">
            {phrase.map((word, index) => (
              <li key={index}>
                <span className="text-subtle mr-2">{index + 1}.</span>
                {word}
              </li>
            ))}
          </ol>
        ) : null}
        {error ? (
          <p className="text-pink-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
