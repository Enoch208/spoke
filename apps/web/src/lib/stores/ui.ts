import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModalEntry, ModalId, ModalPropsMap } from "./modal-props";
import { browserSessionStart, localJsonStorage } from "./storage";

export const maxModalStack = 3;
const alwaysOnTop: ModalId = "M-08";

export type ToastTone = "info" | "success" | "error";

export type ToastAction = { label: string; run: () => void };

export type ToastInput = {
  id: `T-${string}`;
  subject?: string;
  tone: ToastTone;
  message: string;
  status?: string;
  action?: ToastAction;
  secondaryAction?: ToastAction;
  durationMs: number | null;
  liveInDemo?: boolean;
};

export type ToastEntry = ToastInput & { key: string; createdAt: number };

export type BannerDismissal = { until: number | null; session: string | null };

type UiState = {
  modals: ModalEntry[];
  paletteOpen: boolean;
  toasts: ToastEntry[];
  dismissedBanners: Record<string, BannerDismissal>;
  open: <K extends ModalId>(id: K, props: ModalPropsMap[K]) => string;
  close: (key?: string) => void;
  closeAll: () => void;
  setPaletteOpen: (open: boolean) => void;
  pushToast: (toast: ToastInput) => string;
  dismissToast: (key: string) => void;
  dismissBanner: (bannerKey: string, scope: { forMs: number } | "session") => void;
};

let sequence = 0;
const nextKey = (prefix: string) => {
  sequence += 1;
  return `${prefix}-${String(Date.now())}-${String(sequence)}`;
};

const toastIdentity = (toast: Pick<ToastInput, "id" | "subject">) =>
  `${toast.id}:${toast.subject ?? ""}`;

export const stackWith = (stack: readonly ModalEntry[], entry: ModalEntry): ModalEntry[] => {
  if (entry.id === alwaysOnTop) return [...stack.filter((item) => item.id !== alwaysOnTop), entry];
  const pinned = stack.filter((item) => item.id === alwaysOnTop);
  const rest = stack.filter((item) => item.id !== alwaysOnTop);
  const trimmed = rest.length >= maxModalStack ? rest.slice(0, maxModalStack - 1) : rest;
  return [...trimmed, entry, ...pinned];
};

export const isBannerDismissed = (
  dismissal: BannerDismissal | undefined,
  now: number,
  session: string,
) => {
  if (!dismissal) return false;
  if (dismissal.session !== null) return dismissal.session === session;
  return dismissal.until !== null && dismissal.until > now;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      modals: [],
      paletteOpen: false,
      toasts: [],
      dismissedBanners: {},
      open: (id, props) => {
        const key = nextKey(id);
        const entry = { key, id, props } as ModalEntry;
        set((state) => ({ modals: stackWith(state.modals, entry) }));
        return key;
      },
      close: (key) => {
        set((state) => ({
          modals: key
            ? state.modals.filter((modal) => modal.key !== key)
            : state.modals.slice(0, -1),
        }));
      },
      closeAll: () => {
        set({ modals: [] });
      },
      setPaletteOpen: (paletteOpen) => {
        set({ paletteOpen });
      },
      pushToast: (toast) => {
        const identity = toastIdentity(toast);
        let key = nextKey(toast.id);
        set((state) => {
          const existing = state.toasts.find((item) => toastIdentity(item) === identity);
          if (existing) {
            key = existing.key;
            return {
              toasts: state.toasts.map((item) =>
                item.key === existing.key ? { ...toast, key, createdAt: Date.now() } : item,
              ),
            };
          }
          return { toasts: [...state.toasts, { ...toast, key, createdAt: Date.now() }] };
        });
        return key;
      },
      dismissToast: (key) => {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.key !== key) }));
      },
      dismissBanner: (bannerKey, scope) => {
        const dismissal: BannerDismissal =
          scope === "session"
            ? { until: null, session: browserSessionStart() }
            : { until: Date.now() + scope.forMs, session: null };
        set((state) => ({
          dismissedBanners: { ...state.dismissedBanners, [bannerKey]: dismissal },
        }));
      },
    }),
    {
      name: "spoke-ui",
      version: 1,
      storage: localJsonStorage,
      skipHydration: true,
      partialize: ({ dismissedBanners }) => ({ dismissedBanners }),
    },
  ),
);
