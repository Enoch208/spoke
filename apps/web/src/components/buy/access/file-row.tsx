"use client";

import { File01Icon, Link01Icon, Note01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ClientOutput } from "@spoke/protocol";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill, globalStates } from "@/lib/copy";
import { accessCopy } from "../copy/access";

type Item = ClientOutput<"fulfillment.access">["items"][number];
type Mode = ClientOutput<"campaigns.get">["product"]["fulfillmentMode"];

const icons = { download: File01Icon, external: Link01Icon, manual: Note01Icon } as const;
const freshMs = 10_000;

const saveDemoFile = (name: string, product: string) => {
  const blob = new Blob([fill(accessCopy.demoFile, { product })], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function FileRow({
  item,
  index,
  mode,
  product,
  demo,
  refresh,
}: {
  item: Item;
  index: number;
  mode: Mode;
  product: string;
  demo: boolean;
  refresh: () => Promise<Item | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const name = demo
    ? fill(accessCopy.demoName, { n: String(index + 1) })
    : fill(accessCopy.names[mode], { product, n: String(index + 1) });
  const action =
    mode === "external"
      ? accessCopy.openLink
      : mode === "manual"
        ? accessCopy.getText
        : accessCopy.download;
  const open = async () => {
    if (demo) {
      saveDemoFile(name, product);
      return;
    }
    if (Date.parse(item.expiresAt) - Date.now() > freshMs) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    const fresh = await refresh();
    setBusy(false);
    if (fresh) window.open(fresh.url, "_blank", "noopener,noreferrer");
    else setExpired(true);
  };
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-pill text-ink flex size-10 shrink-0 items-center justify-center rounded-xl"
        >
          <HugeiconsIcon icon={icons[mode]} size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-ink flex flex-wrap items-center gap-2 font-medium">
            <span className="min-w-0 break-words">{name}</span>
            {demo ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
          </p>
          <p className="text-subtle text-sm">
            {demo ? accessCopy.demoType : accessCopy.types[mode]}
          </p>
          {expired ? <p className="text-pink-ink text-sm">{accessCopy.expired}</p> : null}
        </div>
      </div>
      <Button
        variant="secondary"
        loading={busy}
        className="max-sm:w-full"
        onClick={() => void open()}
      >
        {action}
      </Button>
    </li>
  );
}
