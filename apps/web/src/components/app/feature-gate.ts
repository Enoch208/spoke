"use client";

import { usePathname } from "next/navigation";
import { featureStatus, type FeatureKey } from "@/lib/features";
import { selectMode, useModeStore } from "@/lib/stores/mode";
import { useUiStore } from "@/lib/stores/ui";
import { featureGateDecision } from "./feature-gate-decision";

export const useFeatureGate = () => {
  const mode = useModeStore(selectMode);
  const open = useUiStore((state) => state.open);
  const pathname = usePathname();
  return (featureKey: FeatureKey, proceed: () => void, returnTo: string = pathname) => {
    if (featureGateDecision(mode, featureStatus(featureKey)) === "proceed") {
      proceed();
      return;
    }
    open("M-44", { featureKey, returnTo });
  };
};
