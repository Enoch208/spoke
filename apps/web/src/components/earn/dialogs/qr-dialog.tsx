"use client";

import { Download01Icon } from "@hugeicons/core-free-icons";
import { useRef } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Qr } from "@/components/ui/qr";
import { useClientContext } from "@/lib/client/provider";
import { common, fill } from "@/lib/copy";
import { qrCopy } from "../copy/links";
import { useCopyLink } from "../shared/link-field";

const sourceSize = 512;

const save = (blob: Blob, name: string) => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(href);
};

const svgBlob = (svg: SVGSVGElement) => {
  const clone = svg.cloneNode(true);
  if (!(clone instanceof SVGSVGElement)) return null;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(sourceSize));
  clone.setAttribute("height", String(sourceSize));
  clone.querySelectorAll("rect").forEach((rect) => {
    rect.setAttribute("fill", "#ffffff");
  });
  clone.querySelectorAll("path").forEach((path) => {
    path.setAttribute("fill", "#1a1a1a");
  });
  return new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
};

const pngFrom = (blob: Blob, name: string) => {
  const image = new Image();
  const href = URL.createObjectURL(blob);
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = sourceSize;
    canvas.height = sourceSize;
    canvas.getContext("2d")?.drawImage(image, 0, 0, sourceSize, sourceSize);
    URL.revokeObjectURL(href);
    canvas.toBlob((png) => {
      if (png) save(png, name);
    }, "image/png");
  };
  image.src = href;
};

export default function QrDialog({ props, isTop, close }: ModalComponentProps<"M-14">) {
  const { mode } = useClientContext();
  const svg = useRef<SVGSVGElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const copyLink = useCopyLink();
  const code = props.url.split("/").filter(Boolean).at(-1) ?? "link";
  const download = (kind: "png" | "svg") => {
    const node = svg.current;
    const blob = node ? svgBlob(node) : null;
    if (!blob) return;
    if (kind === "svg") save(blob, `spoke-${code}.svg`);
    else pngFrom(blob, `spoke-${code}.png`);
  };
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="sm"
      inert={!isTop}
      initialFocus={primary}
      title={qrCopy.title}
      footer={
        <>
          <Button variant="secondary" onClick={() => void copyLink(props.url)}>
            {qrCopy.copy}
          </Button>
          <Button
            variant="secondary"
            icon={Download01Icon}
            onClick={() => {
              download("svg");
            }}
          >
            {qrCopy.svg}
          </Button>
          <Button
            ref={primary}
            icon={Download01Icon}
            onClick={() => {
              download("png");
            }}
          >
            {qrCopy.png}
          </Button>
        </>
      }
    >
      <div className="grid justify-items-center gap-3 text-center">
        <div className="bg-surface border-hairline rounded-2xl border p-4">
          <Qr
            ref={svg}
            value={props.url}
            size={240}
            label={fill(common.qrCode, { target: props.url })}
          />
        </div>
        <p className="text-ink font-mono text-sm break-all">{props.url}</p>
        <p className="text-subtle text-sm">{props.title}</p>
        {mode === "demo" ? <p className="text-amber-ink text-sm">{qrCopy.sample}</p> : null}
      </div>
    </Dialog>
  );
}
