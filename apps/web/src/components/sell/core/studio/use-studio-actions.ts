"use client";

import type { CommissionPolicy } from "@spoke/protocol";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fill } from "@/lib/copy";
import { useClientMutation } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { studioPageCopy } from "./copy-page";
import { handOffToComposer } from "./handoff";
import type { CrossCheck } from "./split";
import type { LibraryTemplate } from "./starting-points";
import type { StudioTerms } from "./terms";
import { useCrossCheck } from "./use-cross-check";

const copy = studioPageCopy;
export const samplePriceMinor = 40_000_000n;

export function useStudioActions({
  selected,
  mine,
  terms,
  policy,
}: {
  selected: LibraryTemplate | null;
  mine: readonly LibraryTemplate[];
  terms: StudioTerms;
  policy: CommissionPolicy | null;
}) {
  const router = useRouter();
  const pushToast = useUiStore((state) => state.pushToast);
  const crossCheck = useCrossCheck();
  const save = useClientMutation("studio.saveTemplate", ["studio.templates"]);
  const [checkResult, setCheckResult] = useState<CrossCheck | null>(null);
  const [dialogName, setDialogName] = useState<string | null>(null);

  const verified = async () => {
    if (!policy) return false;
    const result = await crossCheck(samplePriceMinor, policy);
    setCheckResult(result);
    return result.kind !== "mismatch";
  };

  const persist = async (name: string): Promise<string | null> => {
    if (!policy || !(await verified())) return null;
    const family = mine.find((template) => template.name === name);
    const saved = await save
      .mutateAsync({ name, policy })
      .then((template) => template.id)
      .catch(() => null);
    if (saved)
      pushToast({
        id: "T-02",
        subject: "template",
        tone: "success",
        message: family
          ? fill(copy.save.saved, { version: String(family.version + 1) })
          : copy.save.savedNew,
        durationMs: 3000,
      });
    return saved;
  };

  const saveVersion = async () =>
    selected?.source === "mine" ? persist(selected.name) : Promise.resolve(null);

  const startCampaign = async () => {
    if (!(await verified())) return;
    const templateId = selected?.id ?? "studio";
    const version = selected?.version ?? 1;
    handOffToComposer({ templateId, name: selected?.name ?? null, version, terms });
    router.push(
      `${routes.sell.newCampaign}?template=${encodeURIComponent(templateId)}&version=${String(version)}`,
    );
  };

  return {
    checkResult,
    saving: save.isPending,
    saveVersion,
    persist,
    startCampaign,
    dialogName,
    openDialog: (name: string) => {
      setDialogName(name);
    },
    closeDialog: () => {
      setDialogName(null);
    },
    names: mine.map((template) => template.name),
  };
}
