"use client";

import { CloudUploadIcon, File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-field";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { fill, toasts } from "@/lib/copy";
import { shortHash } from "@/lib/format";
import { useClientMutation } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { uploadCopy as copy } from "../copy/upload";
import { Callout } from "../shared/callout";
import { useIsDemo } from "../shared/hooks";
import { DialogBadge } from "./parts";
import { acceptFor, checkFile, formatMegabytes, isImageKind } from "./upload-rules";

type Done = { id: string; sha256: string | null };

export default function UploadModal({ props, isTop, close }: ModalComponentProps<"M-30">) {
  const demo = useIsDemo();
  const input = useRef<HTMLInputElement>(null);
  const chooser = useRef<HTMLButtonElement>(null);
  const asset = useClientMutation("products.uploadAsset", ["products"]);
  const logo = useClientMutation("merchants.uploadLogo", ["merchants"]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [dragging, setDragging] = useState(false);
  const busy = asset.isPending || logo.isPending;
  const unsupported = props.kind === "avatar" || (props.kind !== "logo" && !props.productId);
  const upload = (picked: File) => {
    const problem = checkFile(props.kind, picked);
    setError(problem);
    setDone(null);
    setFile(problem ? null : picked);
    if (problem) return;
    setPreview(isImageKind(props.kind) ? URL.createObjectURL(picked) : null);
    const fail = () => {
      setError(copy.errors.failed);
    };
    if (props.kind === "logo")
      logo.mutate(
        { file: picked },
        {
          onSuccess: (result) => {
            if (result.url) setDone({ id: result.url, sha256: result.sha256 });
            else fail();
          },
          onError: fail,
        },
      );
    else if (props.productId)
      asset.mutate(
        { id: props.productId, file: picked },
        {
          onSuccess: (result) => {
            setDone({ id: result.id, sha256: result.sha256 });
          },
          onError: fail,
        },
      );
  };
  const save = () => {
    if (!done || !file) return;
    props.onUploaded?.(done.id);
    useUiStore.getState().pushToast({
      id: "T-37",
      tone: "success",
      message: fill(copy.toast, { filename: file.name }),
      durationMs: toasts["T-37"].duration,
    });
    close();
  };
  return (
    <Dialog
      open
      size="md"
      inert={!isTop}
      initialFocus={chooser}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={copy.titles[props.kind]}
      badge={<DialogBadge />}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          {unsupported ? null : (
            <Button disabled={!done} onClick={save}>
              {copy.save}
            </Button>
          )}
        </>
      }
    >
      {unsupported ? (
        <Callout tone="info">{copy.avatarUnavailable}</Callout>
      ) : (
        <div className="space-y-4">
          <input
            ref={input}
            type="file"
            accept={acceptFor(props.kind)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              if (picked) upload(picked);
              event.target.value = "";
            }}
          />
          <button
            ref={chooser}
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => {
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const picked = event.dataTransfer.files[0];
              if (picked) upload(picked);
            }}
            className={cx(
              "border-line hover:border-ink ease-spring flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-[423ms]",
              dragging && "border-ink bg-soft",
            )}
          >
            <HugeiconsIcon icon={CloudUploadIcon} size={28} strokeWidth={1.6} aria-hidden="true" />
            <span className="text-ink font-medium">{copy.drop}</span>
            <span className="text-subtle text-sm">{copy.helpers[props.kind]}</span>
            <span className="bg-pill text-ink mt-1 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium">
              {copy.choose}
            </span>
          </button>
          {props.kind === "deliverable" ? (
            <p className="text-subtle text-sm">{copy.privateNote}</p>
          ) : null}
          {error ? (
            <Callout
              tone="danger"
              action={
                file ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      upload(file);
                    }}
                  >
                    {copy.tryAgain}
                  </Button>
                ) : null
              }
            >
              {error}
            </Callout>
          ) : null}
          {file ? (
            <div className="border-hairline flex items-center gap-3 rounded-xl border p-3">
              {preview ? (
                <img src={preview} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="bg-pill flex size-12 shrink-0 items-center justify-center rounded-lg">
                  <HugeiconsIcon icon={File01Icon} size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-ink truncate text-sm font-medium">{file.name}</p>
                <p className="text-subtle text-xs">{formatMegabytes(file.size)}</p>
                {busy ? (
                  <p role="status" className="text-subtle mt-1 flex items-center gap-2 text-xs">
                    <Spinner />
                    {copy.uploading}
                  </p>
                ) : done ? (
                  <p className="text-lime-ink mt-1 text-xs font-medium">{copy.uploaded}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {done?.sha256 ? (
            <div className="bg-soft space-y-1 rounded-xl px-4 py-3 text-sm">
              <p className="text-subtle">{copy.hash}</p>
              <p className="flex items-center gap-1">
                <span className="text-ink font-mono tabular-nums" title={done.sha256}>
                  {shortHash(`0x${done.sha256}`)}
                </span>
                <CopyButton value={done.sha256} label={copy.hash} copiedMessage={copy.hash} />
              </p>
              <p className="text-subtle text-xs">{copy.hashHelper}</p>
            </div>
          ) : null}
          {demo ? <p className="text-subtle text-xs">{copy.demo}</p> : null}
        </div>
      )}
    </Dialog>
  );
}
