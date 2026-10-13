"use client";

import { demoToken } from "@spoke/protocol";
import { useClientContext } from "@/lib/client/provider";
import type { FeatureKey } from "@/lib/features";
import { isLive } from "@/lib/features";
import {
  accessOf,
  allows,
  noPermissionText,
  useViewAsStore,
  type Capability,
  type Role,
} from "./roles";

export const sdusd = demoToken;

export const useIsDemo = () => useClientContext().mode === "demo";

export const useFeatureOn = (feature: FeatureKey) => {
  const demo = useIsDemo();
  return demo || isLive(feature);
};

export const useRole = (): Role => {
  const demo = useIsDemo();
  const viewAs = useViewAsStore((state) => state.role);
  return demo && viewAs ? viewAs : "owner";
};

export const useCan = (capability: Capability) => {
  const role = useRole();
  return {
    role,
    access: accessOf(capability, role),
    allowed: allows(capability, role),
    reason: allows(capability, role) ? undefined : noPermissionText(capability, role),
  };
};
