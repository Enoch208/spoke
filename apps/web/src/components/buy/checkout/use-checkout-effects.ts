"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { keyForTarget } from "@/lib/query/keys";
import { useCheckoutStore } from "@/lib/stores/checkout";
import type { Mode } from "@/lib/stores/mode";
import type { RecordView } from "./model";

const afterPurchase = [
  "checkout.preview",
  "receipts",
  "funding.status",
  "account.balances",
] as const;

export function useCheckoutEffects(input: { campaignId: string; view: RecordView; mode: Mode }) {
  const queryClient = useQueryClient();
  const { campaignId, mode } = input;
  const done = input.view.kind === "done";
  const indexed = input.view.kind === "done" && input.view.indexed;
  useEffect(() => {
    if (!done) return;
    for (const target of afterPurchase)
      void queryClient.invalidateQueries({ queryKey: keyForTarget(mode, target) });
  }, [done, indexed, mode, queryClient]);
  useEffect(() => {
    if (!done) return;
    return () => {
      useCheckoutStore.getState().clearDraft(campaignId);
    };
  }, [done, campaignId]);
}
