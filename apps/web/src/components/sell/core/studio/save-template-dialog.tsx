"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fill } from "@/lib/copy";
import { studioPageCopy } from "./copy-page";

const copy = studioPageCopy.save;

export const templateNameError = (name: string, existing: readonly string[]) => {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return copy.nameError;
  return existing.some((item) => item.toLowerCase() === trimmed.toLowerCase())
    ? fill(copy.duplicateName, { name: trimmed })
    : undefined;
};

export function SaveTemplateDialog({
  initialName,
  existing,
  onClose,
  onSave,
}: {
  initialName: string;
  existing: readonly string[];
  onClose: () => void;
  onSave: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const error = templateNameError(name, existing);
  const submit = async () => {
    setTouched(true);
    if (error) return;
    setSaving(true);
    setFailed(false);
    const saved = await onSave(name.trim());
    setSaving(false);
    if (saved) onClose();
    else setFailed(true);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="md"
      title={copy.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {copy.cancel}
          </Button>
          <Button loading={saving} onClick={() => void submit()}>
            {copy.submit}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3"
      >
        <Field label={copy.name} helper={copy.nameHelper} error={touched ? error : undefined}>
          <Input
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </Field>
        {failed ? (
          <p role="alert" className="bg-pink-soft text-pink-ink rounded-xl px-3 py-2.5 text-sm">
            {copy.failed}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
