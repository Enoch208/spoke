"use client";

import { formatTokenAmount, type ClientOutput } from "@spoke/protocol";
import { useState } from "react";
import { useSpokeClient } from "@/lib/client/provider";
import { useCrossCheck } from "../studio/use-cross-check";
import type { CrossCheck } from "../studio/split";
import { reviewCopy } from "./copy-rules";
import type { StepKey } from "./fields";
import type { RailStep } from "./rail";
import type { Prepared, StepIssue } from "./step-review";
import type { ComposerModel } from "./use-composer";

export type PreparedValue = ClientOutput<"campaigns.prepareCreate">;

const reviewable: readonly StepKey[] = ["product", "rewards", "budget", "rules"];

export function useStepFlow(model: ComposerModel) {
  const client = useSpokeClient();
  const crossCheck = useCrossCheck();
  const [attempted, setAttempted] = useState<ReadonlySet<StepKey>>(new Set());
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CrossCheck | null>(null);
  const [prepared, setPrepared] = useState<Prepared>({ status: "loading" });
  const [preparedValue, setPreparedValue] = useState<PreparedValue | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const { steps, step, derived } = model;
  const index = steps.indexOf(step);
  const errorCount = (key: StepKey) => derived.steps[key].length;
  const issues: StepIssue[] = steps
    .filter((key) => reviewable.includes(key) && errorCount(key) > 0)
    .map((key) => ({ step: key, count: errorCount(key) }));
  const firstInvalid = steps.findIndex((key) => errorCount(key) > 0);
  const reachedIndex = steps.indexOf(model.reached);

  const prepare = async () => {
    const draft = await model.save.saveNow();
    if (!draft || !client) {
      setPrepared({ status: "error", message: reviewCopy.notSaved });
      return;
    }
    const result = await client
      .call("campaigns.prepareCreate", { id: model.setup.draftId })
      .then((value) => ({ ok: true as const, value }))
      .catch((error: unknown) => ({
        ok: false as const,
        message: error instanceof Error ? error.message : "",
      }));
    if (!result.ok) {
      setPrepared({ status: "error", message: result.message });
      return;
    }
    setPreparedValue(result.value);
    setPrepared({
      status: "ready",
      policyHash: result.value.policyHash,
      metadataHash: result.value.metadataHash,
      version: draft.version,
    });
  };

  const goTo = (key: StepKey) => {
    if (key === "review") {
      setPrepared({ status: "loading" });
      void prepare();
    }
    model.visit(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allowed = (target: number) => {
    const key = steps[target];
    if (!key) return false;
    if (target <= index) return true;
    if (key === "launch" && !confirmed) return false;
    return (
      target <= Math.max(reachedIndex, index + 1) && (firstInvalid === -1 || target <= firstInvalid)
    );
  };

  const rail: RailStep[] = steps.map((key, position) => {
    const errors = errorCount(key);
    const visited = position <= reachedIndex;
    const state: RailStep["state"] =
      position === index
        ? "current"
        : !allowed(position)
          ? "locked"
          : errors > 0 && visited
            ? "error"
            : visited && position < Math.max(index, reachedIndex)
              ? "done"
              : "open";
    return { key, state, errors: visited ? errors : 0 };
  });

  const mark = (key: StepKey) => {
    setAttempted((current) => new Set([...current, key]));
  };

  const prefillDeposit = () => {
    const reward = derived.check.pricing?.rewardMinor ?? null;
    if (model.setup.mode !== "create" || model.fields.deposit || !reward) return;
    const balance = model.balances.tokenMinor;
    const wanted = reward * 25n;
    const affordable = balance !== null && balance < wanted ? (balance / reward) * reward : wanted;
    model.patch({
      deposit: formatTokenAmount(
        affordable > 0n ? affordable : wanted,
        model.setup.token.decimals,
      ).replaceAll(",", ""),
    });
  };

  const next = async () => {
    const nextKey = steps[index + 1];
    if (errorCount(step) > 0) {
      mark(step);
      return;
    }
    if (step === "review" && (!confirmed || issues.length > 0)) {
      mark("review");
      return;
    }
    if (step === "rewards" && derived.policy && model.product) {
      setChecking(true);
      const result = await crossCheck(model.product.priceMinor, derived.policy);
      setChecking(false);
      setCheckResult(result);
      if (result.kind === "mismatch") return;
      prefillDeposit();
    }
    if (nextKey) goTo(nextKey);
  };

  return {
    rail,
    issues,
    prepared,
    preparedValue,
    confirmed,
    setConfirmed,
    checking,
    checkResult,
    showErrors: (key: StepKey) => attempted.has(key) || steps.indexOf(key) < reachedIndex,
    goTo,
    select: (key: StepKey) => {
      if (allowed(steps.indexOf(key))) goTo(key);
    },
    back:
      index > 0
        ? () => {
            const previous = steps[index - 1];
            if (previous) goTo(previous);
          }
        : null,
    next,
    prepare,
    markReview: () => {
      mark("review");
    },
  };
}

export type StepFlow = ReturnType<typeof useStepFlow>;
