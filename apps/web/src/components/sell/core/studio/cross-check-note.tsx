"use client";

import { Alert01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui";
import { crossCheckCopy } from "./copy-errors";
import type { CrossCheck } from "./split";

export function CrossCheckNote({ result }: { result: CrossCheck | null }) {
  const open = useUiStore((state) => state.open);
  if (!result || result.kind === "match") return null;
  if (result.kind === "unavailable")
    return (
      <p className="bg-sky-soft text-sky-ink flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
        <HugeiconsIcon
          icon={InformationCircleIcon}
          size={16}
          strokeWidth={1.8}
          className="mt-0.5 shrink-0"
        />
        {crossCheckCopy.unavailable}
      </p>
    );
  return (
    <div
      role="alert"
      className="bg-pink-soft text-pink-ink flex flex-col gap-2 rounded-xl px-3 py-2.5 text-sm"
    >
      <p className="flex items-start gap-2">
        <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
        {crossCheckCopy.mismatch}
      </p>
      <Button
        variant="danger"
        size="sm"
        className="self-start"
        onClick={() => {
          open("M-41", { category: "product", context: { split: result.detail } });
        }}
      >
        {crossCheckCopy.report}
      </Button>
    </div>
  );
}
