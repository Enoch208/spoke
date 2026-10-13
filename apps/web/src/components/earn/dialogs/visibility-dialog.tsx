"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio";
import { Switch } from "@/components/ui/switch";
import { common, required, toasts, visibilityCopy } from "@/lib/copy";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { visibilityDialogCopy as copy } from "../copy/reputation";
import { DialogError, DialogSkeleton } from "../shared/dialog-states";

const levels = ["public", "pseudonymous", "private"] as const;
type Level = (typeof levels)[number];
const fieldKeys = [
  "settledConversions",
  "netAttributedValue",
  "merchantCount",
  "campaignCount",
] as const;
type Field = (typeof fieldKeys)[number];

export default function VisibilityDialog({ isTop, close }: ModalComponentProps<"M-36">) {
  const pushToast = useUiStore((state) => state.pushToast);
  const save = useRef<HTMLButtonElement>(null);
  const reputation = useClientQuery("reputation.mine", {});
  const me = useClientQuery("account.me", {});
  const update = useClientMutation("reputation.updateVisibility", [
    "reputation",
    "distributors",
    "account.me",
  ]);
  const [level, setLevel] = useState<Level | null>(null);
  const [chosenFields, setFields] = useState<readonly Field[] | null>(null);
  const fields =
    chosenFields ?? fieldKeys.filter((field) => me.data?.visibility?.fields.includes(field));
  const [invites, setInvites] = useState<boolean | null>(null);
  const current = level ?? me.data?.visibility?.level ?? reputation.data?.visibility ?? "private";
  const accepts =
    invites ??
    me.data?.visibility?.acceptsInvitations ??
    reputation.data?.acceptsInvitations ??
    false;
  const needsHandle = current !== "private" && me.data !== undefined && me.data.handle === null;
  const submit = () => {
    update.mutate(
      {
        level: current,
        fields: current === "private" || fields.length === 0 ? [] : [...fields, "refundAdjustment"],
        acceptsInvitations: accepts,
      },
      {
        onSuccess: () => {
          pushToast({
            id: "T-42",
            tone: "success",
            message: toasts["T-42"].copy[current],
            durationMs: toasts["T-42"].duration,
          });
          close();
        },
      },
    );
  };
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="md"
      inert={!isTop}
      initialFocus={save}
      title={copy.title}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {common.cancel}
          </Button>
          <Button
            ref={save}
            loading={update.isPending}
            disabled={needsHandle || !reputation.data || !me.data?.visibility}
            onClick={submit}
          >
            {copy.save}
          </Button>
        </>
      }
    >
      {reputation.isPending ? <DialogSkeleton /> : null}
      {reputation.error ? (
        <DialogError error={reputation.error} retry={() => void reputation.refetch()} />
      ) : null}
      {reputation.data ? (
        <div className="grid gap-5">
          <RadioGroup
            label={copy.legend}
            value={current}
            onValueChange={setLevel}
            options={levels.map((value) => ({
              value,
              label: visibilityCopy[value].label,
              description: visibilityCopy[value].explainer.replace(
                "{handle}",
                me.data?.handle ?? "…",
              ),
            }))}
          />
          {needsHandle ? (
            <p className="bg-amber-soft text-amber-ink flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm">
              {copy.noHandle}
              <Link
                href={routes.settings.profile}
                onClick={close}
                className="text-ink font-medium underline"
              >
                {copy.setHandle}
              </Link>
            </p>
          ) : null}
          {current !== "private" ? (
            <fieldset className="grid gap-2">
              <legend className="text-ink mb-1 text-sm font-medium">{copy.fields}</legend>
              {fieldKeys.map((key) => (
                <Checkbox
                  key={key}
                  checked={fields.includes(key)}
                  onCheckedChange={(checked) => {
                    setFields(checked ? [...fields, key] : fields.filter((field) => field !== key));
                  }}
                  label={copy.fieldLabels[key]}
                />
              ))}
              <p className="text-subtle text-sm">{copy.fieldLabels.refundAdjustment}</p>
            </fieldset>
          ) : null}
          <Switch checked={accepts} onCheckedChange={setInvites} label={copy.invitations} />
          <p className="text-subtle text-sm">{copy.explorer}</p>
          <p className="text-subtle text-sm">{required.reputation}</p>
          {update.error ? <DialogError error={update.error} retry={submit} /> : null}
        </div>
      ) : null}
    </Dialog>
  );
}
