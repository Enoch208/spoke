"use client";

import { toasts } from "@/lib/copy";
import { useUiStore } from "@/lib/stores/ui";

export const useCopy = () => {
  const pushToast = useUiStore((state) => state.pushToast);
  return async (text: string, copiedMessage: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      pushToast({
        id: "T-45",
        tone: "error",
        message: toasts["T-45"].copy,
        durationMs: toasts["T-45"].duration,
      });
      return false;
    }
    pushToast({
      id: "T-01",
      subject: copiedMessage,
      tone: "success",
      message: copiedMessage,
      durationMs: toasts["T-01"].duration,
    });
    return true;
  };
};
