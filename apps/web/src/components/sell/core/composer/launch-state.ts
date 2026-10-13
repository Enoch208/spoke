"use client";

import { useModeStore } from "@/lib/stores/mode";
import { useTxStore } from "@/lib/stores/tx";
import { overallStatus } from "@/lib/tx/records";
import type { AnyTxRecord } from "@/lib/tx/types";

export type LaunchState =
  | { readonly kind: "none" }
  | { readonly kind: "active"; readonly txId: string }
  | { readonly kind: "done"; readonly txId: string; readonly campaignId: string }
  | {
      readonly kind: "stuck";
      readonly txId: string;
      readonly campaignId: string;
      readonly funded: boolean;
    };

export const launchKey = (draftId: string) => `createCampaign:${draftId}`;

export const useLaunchRecord = (draftId: string): AnyTxRecord | null => {
  const mode = useModeStore((state) => state.mode);
  return useTxStore((state) => {
    let latest: AnyTxRecord | null = null;
    for (const record of state.records)
      if (
        record.resumeKey === launchKey(draftId) &&
        record.mode === mode &&
        (!latest || record.startedAt > latest.startedAt)
      )
        latest = record;
    return latest;
  });
};

export const launchStateOf = (record: AnyTxRecord | null): LaunchState => {
  if (!record) return { kind: "none" };
  const overall = overallStatus(record);
  const campaignId = record.context.campaignId;
  if (overall === "done" || overall === "already_done")
    return { kind: "done", txId: record.id, campaignId: campaignId ?? "" };
  const terminal =
    overall === "failed" ||
    overall === "rejected" ||
    overall === "replaced" ||
    overall === "expired";
  if (!terminal) return { kind: "active", txId: record.id };
  if (!campaignId) return { kind: "none" };
  const funded = record.steps.some(
    (step) => step.kind === "fundCampaign" && step.status === "done",
  );
  return { kind: "stuck", txId: record.id, campaignId, funded };
};
