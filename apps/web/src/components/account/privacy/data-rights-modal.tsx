"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/lib/stores/ui";
import { privacyCopy as copy } from "../copy/privacy";
import { useDataRights } from "./use-data-rights";

export default function DataRightsModal({ props, close, isTop }: ModalComponentProps<"M-38">) {
  const data = useDataRights(close);
  const [typed, setTyped] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const deleting = props.mode === "delete";
  const blocked =
    deleting &&
    (data.demo ||
      data.active ||
      data.pendingTx ||
      (data.me.data?.isMerchant && !data.campaigns.data));
  return (
    <>
      <Dialog
        open
        inert={!isTop}
        size="md"
        role={deleting ? "alertdialog" : "dialog"}
        initialFocus={cancel}
        dismissible={!data.busy}
        title={deleting ? copy.deleteTitle : copy.exportTitle}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        footer={
          <>
            <Button ref={cancel} variant="secondary" onClick={close} disabled={data.busy}>
              {copy.cancel}
            </Button>
            {deleting && data.demo ? (
              <Button
                onClick={() => {
                  close();
                  useUiStore.getState().open("M-42", { intent: "reset" });
                }}
              >
                {copy.reset}
              </Button>
            ) : (
              <Button
                variant={deleting ? "danger" : "primary"}
                loading={data.busy}
                disabled={
                  Boolean(blocked) ||
                  (deleting && typed.trim().toLowerCase() !== "delete my account")
                }
                onClick={() => void data.run(props.mode)}
              >
                {deleting ? copy.delete : copy.prepare}
              </Button>
            )}
          </>
        }
      >
        <div className="grid gap-4">
          <p className="text-body text-sm">{deleting ? copy.deleteBody : copy.exportBody}</p>
          {deleting ? (
            <>
              {data.pendingTx ? (
                <Callout tone="caution">
                  Wait for your transaction to finish before deleting your account.
                </Callout>
              ) : null}
              <Callout tone="caution">{copy.caution}</Callout>
              <p className="text-body text-sm">{copy.passkey}</p>
              {data.demo ? (
                <Callout tone="info">{copy.demoDelete}</Callout>
              ) : data.active ? (
                <Callout
                  tone="caution"
                  actions={
                    <Link className="underline" href="/sell/campaigns" onClick={close}>
                      Go to campaigns
                    </Link>
                  }
                >
                  {copy.active}
                </Callout>
              ) : (
                <Field label={copy.confirm}>
                  <Input
                    value={typed}
                    autoComplete="off"
                    onChange={(event) => {
                      setTyped(event.target.value);
                    }}
                  />
                </Field>
              )}
            </>
          ) : null}
          {data.job ? (
            data.job.status === "ready" && data.job.url ? (
              <Button asChild>
                <a href={data.job.url} download>
                  {copy.download}
                </a>
              </Button>
            ) : (
              <p role="status">{copy.queued}</p>
            )
          ) : null}
          {data.error ? (
            <p role="alert" className="text-pink-ink text-sm">
              {data.error}
            </p>
          ) : null}
        </div>
      </Dialog>
      {data.prompt}
    </>
  );
}
