"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useDemoMode } from "@/lib/demo/use-demo-mode";
import { useDemoStore } from "@/lib/stores/demo";

export default function DemoModeModal({ props, close, isTop }: ModalComponentProps<"M-42">) {
  const cancel = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { enterDemo, exitDemo } = useDemoMode();
  const reset = props.intent === "reset";
  const act = () => {
    close();
    if (reset) {
      useDemoStore.getState().reset();
      location.assign("/demo");
    } else if (props.intent === "exit") exitDemo({ next: props.returnTo ?? null });
    else if (props.persona) enterDemo({ persona: props.persona, next: props.returnTo ?? null });
    else router.push(`/demo${props.returnTo ? `?next=${encodeURIComponent(props.returnTo)}` : ""}`);
  };
  return (
    <Dialog
      open
      inert={!isTop}
      size="sm"
      role={reset ? "alertdialog" : "dialog"}
      initialFocus={cancel}
      title={reset ? "Reset demo data?" : "Explore the demo"}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footer={
        <>
          <Button ref={cancel} variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant={reset ? "danger" : "primary"} onClick={act}>
            {reset ? "Reset demo" : "Continue"}
          </Button>
        </>
      }
    >
      <p className="text-body">
        {reset
          ? "Sample purchases, links and claims you made in this browser are cleared. Live data isn't affected."
          : "The demo runs with sample merchants, people and sales. No tokens move and nothing touches the chain."}
      </p>
    </Dialog>
  );
}
