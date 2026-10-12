import type { FeatureStatus } from "@/lib/features";
import type { Mode } from "@/lib/stores/mode";

export const featureGateDecision = (mode: Mode, status: FeatureStatus): "proceed" | "explain" =>
  mode === "demo" || status === "live" ? "proceed" : "explain";
