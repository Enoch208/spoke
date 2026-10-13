import { useUiStore, type ToastTone } from "@/lib/stores/ui";

export const toast = (
  id: `T-${string}`,
  message: string,
  tone: ToastTone = "success",
  durationMs = 3000,
) => {
  useUiStore.getState().pushToast({ id, tone, message, durationMs });
};
