import { bytesToHex } from "viem";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJsonStorage } from "./storage";

export const checkoutSteps = ["review", "funds", "approve", "pay", "done"] as const;
export type CheckoutStep = (typeof checkoutSteps)[number];

export type CheckoutDraft = {
  campaignId: string;
  nodeId: string | null;
  orderKey: `0x${string}`;
  step: CheckoutStep;
  intentId: string | null;
  txSent: boolean;
  createdAt: number;
};

type CheckoutState = {
  drafts: Record<string, CheckoutDraft>;
  startDraft: (campaignId: string, nodeId: string | null) => CheckoutDraft;
  updateDraft: (
    campaignId: string,
    patch: Partial<Omit<CheckoutDraft, "campaignId" | "orderKey">>,
  ) => void;
  clearDraft: (campaignId: string) => void;
};

export const newOrderKey = (): `0x${string}` => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      drafts: {},
      startDraft: (campaignId, nodeId) => {
        const existing = get().drafts[campaignId];
        if (existing && existing.nodeId === nodeId) return existing;
        const draft: CheckoutDraft = {
          campaignId,
          nodeId,
          orderKey: newOrderKey(),
          step: "review",
          intentId: null,
          txSent: false,
          createdAt: Date.now(),
        };
        set((state) => ({ drafts: { ...state.drafts, [campaignId]: draft } }));
        return draft;
      },
      updateDraft: (campaignId, patch) => {
        set((state) => {
          const draft = state.drafts[campaignId];
          return draft
            ? { drafts: { ...state.drafts, [campaignId]: { ...draft, ...patch } } }
            : state;
        });
      },
      clearDraft: (campaignId) => {
        set((state) => {
          const { [campaignId]: removed, ...rest } = state.drafts;
          return removed ? { drafts: rest } : state;
        });
      },
    }),
    {
      name: "spoke-checkout",
      version: 1,
      storage: localJsonStorage,
      skipHydration: true,
      partialize: ({ drafts }) => ({ drafts }),
    },
  ),
);
