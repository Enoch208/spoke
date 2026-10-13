"use client";

import { computeReward } from "@spoke/protocol";
import { useUiStore } from "@/lib/stores/ui";
import { termsFromPolicy } from "../studio/policy";
import type { ComposerModel } from "./use-composer";

export const useSimulate = (model: ComposerModel) => {
  const open = useUiStore((state) => state.open);
  const { derived, product, setup, fields, patch } = model;
  return () => {
    open("M-27", {
      mode: "edit",
      ...(derived.policy ? { policy: derived.policy } : {}),
      onApply: (applied) => {
        const formula = product
          ? computeReward(product.priceMinor, applied.commissionBps, product.priceMinor)
          : null;
        patch({
          terms: { ...termsFromPolicy(applied, setup.token, formula), hold: fields.terms.hold },
          template: null,
        });
      },
    });
  };
};
