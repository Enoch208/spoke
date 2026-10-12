"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { featureNames, featureNotLiveDialog, featureSentences, fill } from "@/lib/copy";
import { featureStatus, type FeatureKey } from "@/lib/features";
import { routes, withNext } from "@/lib/routes";
import { selectMode, useModeStore } from "@/lib/stores/mode";
import type { ModalComponentProps } from "../modal-types";
import { featureGateDecision } from "../feature-gate-decision";

const sentences: Partial<Record<FeatureKey, string>> = featureSentences;

export default function FeatureNotLive({ props, isTop, close }: ModalComponentProps<"M-44">) {
  const router = useRouter();
  const pathname = usePathname();
  const mode = useModeStore(selectMode);
  const tryDemo = useRef<HTMLButtonElement>(null);
  const proceed = featureGateDecision(mode, featureStatus(props.featureKey)) === "proceed";

  useEffect(() => {
    if (proceed) close();
  }, [proceed, close]);

  if (proceed) return null;

  const featureName = featureNames[props.featureKey];
  const body = fill(featureNotLiveDialog.body, {
    featureSentence: sentences[props.featureKey] ?? "",
  }).trim();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      size="sm"
      inert={!isTop}
      initialFocus={tryDemo}
      title={fill(featureNotLiveDialog.title, { featureName })}
      subtitle={body}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {featureNotLiveDialog.actions.back}
          </Button>
          <Button
            ref={tryDemo}
            onClick={() => {
              close();
              router.push(withNext(routes.demo, props.returnTo ?? pathname));
            }}
          >
            {featureNotLiveDialog.actions.tryDemo}
          </Button>
        </>
      }
    >
      <Link
        href={routes.labs}
        onClick={close}
        className="text-ink text-sm underline underline-offset-2"
      >
        {featureNotLiveDialog.actions.seeWhatsLive}
      </Link>
    </Dialog>
  );
}
