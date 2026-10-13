"use client";

import { Share08Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { modalRegistry } from "@/components/app/modal-registry";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { purchaseCopy } from "./copy/purchase";

const hiddenKey = (saleId: string) => `spoke-share-hidden:${saleId}`;

const readHidden = (saleId: string) => {
  try {
    return window.localStorage.getItem(hiddenKey(saleId)) === "1";
  } catch {
    return false;
  }
};

const writeHidden = (saleId: string) => {
  try {
    window.localStorage.setItem(hiddenKey(saleId), "1");
    return true;
  } catch {
    return false;
  }
};

export function ShareCard({
  saleId,
  campaignId,
  parentNodeId,
  title,
  body,
  existingNodeId,
}: {
  saleId: string;
  campaignId: string;
  parentNodeId: string | null;
  title: string;
  body: string;
  existingNodeId: string | null;
}) {
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && readHidden(saleId));
  if (hidden) return null;
  if (existingNodeId)
    return (
      <section className="bg-surface border-hairline flex flex-col gap-3 rounded-2xl border p-5">
        <p className="text-ink font-medium">{purchaseCopy.share.sharing}</p>
        <Button asChild variant="secondary" className="self-start">
          <Link href={routeTo.link(existingNodeId)}>{purchaseCopy.share.openLink}</Link>
        </Button>
      </section>
    );
  const canCreate = Boolean(modalRegistry["M-12"]);
  return (
    <section className="bg-surface border-hairline flex flex-col gap-3 rounded-2xl border p-5">
      <span
        aria-hidden="true"
        className="bg-lime-soft text-lime-ink flex size-10 items-center justify-center rounded-full"
      >
        <HugeiconsIcon icon={Share08Icon} size={18} strokeWidth={1.8} />
      </span>
      <h2 className="text-ink font-medium">{title}</h2>
      <p className="text-body text-sm">{body}</p>
      <div className="flex flex-wrap gap-2">
        {canCreate ? (
          <Button
            onClick={() => {
              useUiStore.getState().open("M-12", {
                campaignId,
                ...(parentNodeId && parentNodeId !== "0" ? { parentNodeId } : {}),
              });
            }}
          >
            {purchaseCopy.share.create}
          </Button>
        ) : (
          <Button asChild>
            <Link href={routeTo.campaign(campaignId)}>{purchaseCopy.share.openCampaign}</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            writeHidden(saleId);
            setHidden(true);
          }}
        >
          {purchaseCopy.share.notNow}
        </Button>
      </div>
    </section>
  );
}

export const shareBodyFor = (product: string) => fill(purchaseCopy.share.doneBody, { product });
