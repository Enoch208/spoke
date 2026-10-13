"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fill } from "@/lib/copy";
import { useSpokeClient } from "@/lib/client/provider";
import { formatDateTime } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { useModeStore } from "@/lib/stores/mode";
import { useTxStore } from "@/lib/stores/tx";
import { useUiStore } from "@/lib/stores/ui";
import { asBytes32 } from "@/lib/tx/calls";
import { overallStatus } from "@/lib/tx/records";
import { useChainAction } from "@/lib/tx/use-action";
import { launchCopy, newTermsCopy } from "./copy-launch";
import { localToMs } from "./derive-rules";
import type { ComposerModel } from "./use-composer";
import { useDeployed } from "./use-launch";
import type { StepFlow } from "./use-step-flow";

const usePublishDone = (campaignId: string, policyHash: string | null) => {
  const mode = useModeStore((state) => state.mode);
  return useTxStore((state) =>
    policyHash === null
      ? false
      : state.records.some(
          (record) =>
            record.mode === mode &&
            record.resumeKey === `registerPolicyVersion:${campaignId}:${policyHash}` &&
            overallStatus(record) === "done",
        ),
  );
};

export function useVersionPublish(model: ComposerModel, flow: StepFlow, blocked: boolean) {
  const client = useSpokeClient();
  const router = useRouter();
  const start = useChainAction();
  const deployed = useDeployed();
  const pushToast = useUiStore((state) => state.pushToast);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const target = model.setup.target;
  const campaignId = target?.campaignId ?? "";
  const policyHash = flow.prepared.status === "ready" ? flow.prepared.policyHash : null;
  const done = usePublishDone(campaignId, policyHash);
  const effectiveMs = localToMs(model.fields.effectiveAt);
  const handled = useRef(false);
  useEffect(() => {
    if (!done || handled.current) return;
    handled.current = true;
    pushToast({
      id: "T-23",
      tone: "success",
      message: fill(newTermsCopy.toast, {
        effectiveAt: effectiveMs === null ? "" : formatDateTime(new Date(effectiveMs)),
      }),
      durationMs: 6000,
    });
    router.push(routeTo.sellCampaign(campaignId, "policy"));
  }, [done, campaignId, effectiveMs, pushToast, router]);

  const check = async (): Promise<string | null> => {
    if (!deployed) return launchCopy.notDeployed;
    if (!client || !target || effectiveMs === null) return null;
    const draft = await model.save.saveNow();
    if (!draft || flow.prepared.status !== "ready") return launchCopy.termsChanged;
    const fresh = await client
      .call("campaigns.prepareCreate", { id: model.setup.draftId })
      .then((value) => ({ ok: true as const, value }))
      .catch((error: unknown) => ({
        ok: false as const,
        message: error instanceof Error ? error.message : "",
      }));
    if (!fresh.ok) return fill(launchCopy.failed, { reason: fresh.message });
    if (fresh.value.policyHash !== flow.prepared.policyHash) return launchCopy.termsChanged;
    const funding = await client
      .call("funding.status", {})
      .then((value) => BigInt(value.monWei))
      .catch(() => null);
    if (funding === 0n) return launchCopy.noMon;
    start("registerPolicyVersion", {
      campaignId,
      campaignName: target.name,
      policy: fresh.value.policy,
      policyHash: asBytes32(fresh.value.policyHash),
      effectiveAt: new Date(effectiveMs).toISOString(),
    });
    return null;
  };

  const publish = async () => {
    if (blocked) {
      flow.markReview();
      return;
    }
    setBusy(true);
    setIssue(null);
    setIssue(await check());
    setBusy(false);
  };
  return { publish, busy, issue, deployed };
}
