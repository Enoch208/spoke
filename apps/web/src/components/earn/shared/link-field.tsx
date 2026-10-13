"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/ui/use-copy";
import { useClientContext } from "@/lib/client/provider";
import { toasts } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";

export function useCopyLink() {
  const { mode } = useClientContext();
  const copy = useCopy();
  const pushToast = useUiStore((state) => state.pushToast);
  return async (url: string) => {
    if (mode !== "demo") return copy(url, toasts["T-01"].copy.link);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return copy(url, toasts["T-01"].copy.link);
    }
    pushToast({
      id: "T-46",
      tone: "success",
      message: toasts["T-46"].copy,
      durationMs: toasts["T-46"].duration,
    });
    return true;
  };
}

export function LinkField({
  url,
  label,
  disabled = false,
  buttonRef,
}: {
  url: string;
  label: string;
  disabled?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const copyLink = useCopyLink();
  return (
    <div className="bg-soft border-line flex flex-col gap-2 rounded-xl border p-2 sm:flex-row sm:items-center">
      <span className="text-ink min-w-0 flex-1 px-2 font-mono text-sm break-all tabular-nums">
        {url}
      </span>
      <Button
        {...(buttonRef ? { ref: buttonRef } : {})}
        size="sm"
        variant="secondary"
        icon={Copy01Icon}
        disabled={disabled}
        className="shrink-0"
        onClick={() => void copyLink(url)}
      >
        {label}
      </Button>
    </div>
  );
}
