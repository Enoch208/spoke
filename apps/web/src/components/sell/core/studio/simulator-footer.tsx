"use client";

import type { CommissionPolicy } from "@spoke/protocol";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientMutation } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { simulatorCopy } from "./copy-simulator";
import type { CrossCheck } from "./split";
import { useCrossCheck } from "./use-cross-check";

const copy = simulatorCopy;

function SaveInline({ policy, onDone }: { policy: CommissionPolicy; onDone: () => void }) {
  const save = useClientMutation("studio.saveTemplate", ["studio.templates"]);
  const pushToast = useUiStore((state) => state.pushToast);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setError(copy.templateNameError);
      return;
    }
    const saved = await save
      .mutateAsync({ name: trimmed, policy })
      .then(() => true)
      .catch(() => false);
    if (!saved) {
      setError(copy.saveFailed);
      return;
    }
    pushToast({
      id: "T-02",
      subject: "template",
      tone: "success",
      message: copy.saved,
      durationMs: 3000,
    });
    onDone();
  };
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Input
          aria-label={copy.templateName}
          placeholder={copy.templateName}
          maxLength={80}
          aria-invalid={error ? true : undefined}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        {error ? <p className="text-pink-ink text-sm">{error}</p> : null}
      </div>
      <Button variant="secondary" onClick={onDone}>
        {simulatorCopy.close}
      </Button>
      <Button loading={save.isPending} onClick={() => void submit()}>
        {copy.saveSubmit}
      </Button>
    </div>
  );
}

export function SimulatorFooter({
  readOnly,
  canApply,
  policy,
  priceMinor,
  onCheck,
  onApply,
  onReset,
  onClose,
}: {
  readOnly: boolean;
  canApply: boolean;
  policy: CommissionPolicy | null;
  priceMinor: bigint | null;
  onCheck: (result: CrossCheck) => void;
  onApply: (policy: CommissionPolicy) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const crossCheck = useCrossCheck();
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  if (readOnly) return <Button onClick={onClose}>{copy.close}</Button>;
  if (saving && policy)
    return (
      <SaveInline
        policy={policy}
        onDone={() => {
          setSaving(false);
        }}
      />
    );
  const apply = async () => {
    if (!policy || priceMinor === null) return;
    setChecking(true);
    const result = await crossCheck(priceMinor, policy);
    setChecking(false);
    onCheck(result);
    if (result.kind !== "mismatch") onApply(policy);
  };
  return (
    <>
      <Button variant="ghost" onClick={onReset}>
        {copy.reset}
      </Button>
      <Button
        variant="secondary"
        disabled={!policy}
        onClick={() => {
          setSaving(true);
        }}
      >
        {copy.saveTemplate}
      </Button>
      {canApply ? (
        <Button
          loading={checking}
          disabled={!policy || priceMinor === null}
          onClick={() => void apply()}
        >
          {copy.apply}
        </Button>
      ) : (
        <Button onClick={onClose}>{copy.close}</Button>
      )}
    </>
  );
}
