"use client";

import type { ClientOutput } from "@spoke/protocol";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useClientContext } from "@/lib/client/provider";
import { internalPath } from "@/lib/demo/landing";
import { useClientMutation } from "@/lib/query/use-client";
import { welcomeCopy as copy, type WelcomeIntent } from "../copy/welcome";
import { handleBlocks, useHandleCheck } from "../shared/use-handle-check";
import { errorText } from "../shared/error-text";

export function useWelcome(me: ClientOutput<"account.me">) {
  const { mode } = useClientContext();
  const demo = mode === "demo";
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("intent");
  const initial =
    copy.intents.find((option) => option.value === requested)?.value ??
    (demo ? null : me.onboarding.intent);
  const [intent, setIntent] = useState<WelcomeIntent | null>(initial);
  const [step, setStep] = useState(demo || me.onboarding.intent === null ? 0 : 1);
  const [alreadyCompleted] = useState(me.onboarding.completedAt !== null);
  const [failure, setFailure] = useState<string | null>(null);
  const [name, setName] = useState(demo ? "" : me.displayName);
  const [handle, setHandle] = useState(demo ? "" : (me.handle ?? ""));
  const [avatar, setAvatar] = useState(me.avatarSeed);
  const [backedUp, setBackedUp] = useState(!demo && me.recovery.checkedAt !== null);
  const update = useClientMutation("account.updateProfile", ["account.me", "reputation"]);
  const check = useHandleCheck(handle, me.handle);
  const recovery = me.accountKind !== "wallet";
  const destination = copy.intents.find((option) => option.value === intent);
  const next = internalPath(params.get("next"));
  useEffect(() => {
    if (!demo && alreadyCompleted) router.replace(next ?? "/earn");
  }, [demo, alreadyCompleted, next, router]);
  const nameInvalid = name.trim().length > 40 || /https?:\/\/|www\./i.test(name);
  const advance = async () => {
    if (step === 0 && !intent) return;
    if (!demo && step === 0 && intent !== "build" && intent !== null)
      await update.mutateAsync({ intent });
    if (!demo && step === 1)
      await update.mutateAsync({
        displayName: name.trim(),
        avatarSeed: avatar,
        ...(handle ? { handle } : {}),
      });
    if (!demo && step === 3) await update.mutateAsync({ onboardingCompleted: true });
    setStep(step === 1 && !recovery ? 3 : step + 1);
  };
  const continueStep = async () => {
    setFailure(null);
    try {
      await advance();
    } catch (error) {
      setFailure(errorText(error));
    }
  };
  return {
    me,
    demo,
    intent,
    setIntent,
    step,
    setStep,
    name,
    setName,
    handle,
    setHandle,
    avatar,
    setAvatar,
    backedUp,
    setBackedUp,
    check,
    recovery,
    destination,
    error: failure,
    pending: update.isPending,
    blocked: step === 0 ? !intent : step === 1 && (nameInvalid || handleBlocks(check)),
    nameInvalid,
    steps: recovery ? copy.steps : copy.steps.filter((item) => item !== "Recovery"),
    index: recovery || step < 2 ? step : step - 1,
    continueStep,
    back: () => {
      setStep(step === 3 && !recovery ? 1 : Math.max(0, step - 1));
    },
    finish: () => {
      router.push(next ?? destination?.href ?? "/earn");
    },
  };
}

export type Welcome = ReturnType<typeof useWelcome>;
