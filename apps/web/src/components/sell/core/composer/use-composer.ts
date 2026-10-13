"use client";

import type { CommissionPolicy } from "@spoke/protocol";
import { useEffect, useMemo, useState } from "react";
import { useClientQuery } from "@/lib/query/use-client";
import { useModeStore } from "@/lib/stores/mode";
import { useNow } from "@/lib/use-now";
import type { LibraryTemplate } from "../studio/starting-points";
import { derive, type ComposerContext, type ComposerToken, type ProductLite } from "./derive";
import { requestFor } from "./draft-request";
import {
  extrasOf,
  stepsFor,
  writeExtras,
  type ComposerFields,
  type ComposerMode,
  type StepKey,
} from "./fields";
import { useDraftSave, type Draft } from "./use-draft-save";

export type VersionTarget = {
  readonly campaignId: string;
  readonly name: string;
  readonly version: number;
  readonly current: CommissionPolicy;
  readonly endsAt: number;
  readonly product: ProductLite;
  readonly scheduled: { readonly version: number; readonly effectiveAt: string } | null;
};

export type ComposerSetup = {
  readonly mode: ComposerMode;
  readonly draftId: string;
  readonly initialDraft: Draft | null;
  readonly initialFields: ComposerFields;
  readonly initialStep: StepKey;
  readonly products: readonly ProductLite[];
  readonly token: ComposerToken;
  readonly alertDefault: number;
  readonly contact: string | null;
  readonly target: VersionTarget | null;
  readonly templates: readonly LibraryTemplate[];
};

export function useComposer(setup: ComposerSetup) {
  const appMode = useModeStore((state) => state.mode);
  const now = useNow();
  const [fields, setFields] = useState(setup.initialFields);
  const [step, setStep] = useState<StepKey>(setup.initialStep);
  const steps = stepsFor(setup.mode);
  const [reached, setReached] = useState<StepKey>(() => {
    const fromDraft = setup.initialDraft
      ? stepsFor("create")[setup.initialDraft.stepReached]
      : undefined;
    const draftIndex = fromDraft ? steps.indexOf(fromDraft) : -1;
    const startIndex = steps.indexOf(setup.initialStep);
    return steps[Math.max(draftIndex, startIndex, 0)] ?? setup.initialStep;
  });
  const [persisted, setPersisted] = useState(setup.initialDraft !== null);
  const funding = useClientQuery("funding.status", {}, { refetchInterval: 15_000 });
  const balanceMinor = funding.data?.sdusd ? BigInt(funding.data.sdusd) : null;
  const product =
    setup.mode === "create"
      ? (setup.products.find((item) => item.id === fields.productId) ?? null)
      : (setup.target?.product ?? null);
  const readyIds = useMemo(() => new Set(setup.products.map((item) => item.id)), [setup.products]);
  const context: ComposerContext = {
    mode: setup.mode,
    product,
    readyIds,
    token: setup.token,
    balanceMinor,
    now,
    current: setup.target?.current ?? null,
    campaignEndsAt: setup.target?.endsAt ?? null,
  };
  const derived = derive(fields, context);
  const request = requestFor(fields, context, reached, setup.target?.campaignId ?? null);
  const save = useDraftSave({
    draftId: setup.draftId,
    initial: setup.initialDraft,
    request,
    onSaved: () => {
      setPersisted(true);
    },
  });
  const scope = `${appMode}:${setup.mode}`;
  useEffect(() => {
    writeExtras(scope, setup.draftId, extrasOf(fields));
  }, [scope, setup.draftId, fields]);

  const patch = (next: Partial<ComposerFields>) => {
    setFields((current) => ({ ...current, ...next }));
  };
  const visit = (key: StepKey) => {
    setStep(key);
    setReached((current) => (steps.indexOf(key) > steps.indexOf(current) ? key : current));
  };
  return {
    setup,
    fields,
    setFields,
    patch,
    step,
    steps,
    reached,
    visit,
    persisted,
    product,
    derived,
    context,
    now,
    save,
    canSave: request !== null,
    balances: {
      tokenMinor: balanceMinor,
      monWei: funding.data ? BigInt(funding.data.monWei) : null,
    },
  };
}

export type ComposerModel = ReturnType<typeof useComposer>;
