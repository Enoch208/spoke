"use client";

import Link from "next/link";
import { useState } from "react";
import { CampaignStateKeyChip } from "@/components/product/campaign-state-chip";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fill } from "@/lib/copy";
import { formatRelative } from "@/lib/format";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { campaignsCopy as copy } from "../copy/campaigns";
import type { MerchantCampaignRow } from "../shared/campaign-rules";
import { termsText } from "./campaign-view";

type DraftRowData = MerchantCampaignRow & { draftId: string };

function DeleteDraft({ draftId, name }: { draftId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const remove = useClientMutation("campaigns.deleteDraft", ["campaigns"]);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(true);
        }}
      >
        {copy.deleteDraft}
      </Button>
      <Dialog
        open={open}
        size="sm"
        role="alertdialog"
        onOpenChange={setOpen}
        title={copy.deleteTitle}
        subtitle={name}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
              }}
            >
              {copy.keep}
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => {
                remove.mutate(
                  { id: draftId },
                  {
                    onSuccess: () => {
                      setOpen(false);
                    },
                  },
                );
              }}
            >
              {copy.deleteConfirm}
            </Button>
          </>
        }
      >
        <p className="text-body">{copy.deleteBody}</p>
        {remove.error ? (
          <p role="alert" className="text-pink-ink mt-3 text-sm">
            {remove.error.message}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}

function DraftRow({ row }: { row: DraftRowData }) {
  const draft = useClientQuery("campaigns.getDraft", { id: row.draftId });
  const step = copy.steps[draft.data?.stepReached ?? 0] ?? copy.steps[0];
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink font-medium">{row.productTitle}</span>
          <CampaignStateKeyChip stateKey="draft" />
        </div>
        <p className="text-subtle text-sm">{termsText(row.policy)}</p>
        <p className="text-subtle text-xs">
          {draft.data ? (
            `${fill(copy.draftSaved, { time: formatRelative(new Date(draft.data.savedAt)) })} · ${fill(copy.draftStep, { step })}`
          ) : (
            <Skeleton className="h-3 w-40" />
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <DeleteDraft draftId={row.draftId} name={row.productTitle} />
        <Button asChild size="sm">
          <Link href={`/sell/campaigns/new?draft=${encodeURIComponent(row.draftId)}`}>
            {copy.continue}
          </Link>
        </Button>
      </div>
    </li>
  );
}

export function DraftRows({ rows }: { rows: readonly DraftRowData[] }) {
  return (
    <ul className="divide-hairline divide-y">
      {rows.map((row) => (
        <DraftRow key={row.draftId} row={row} />
      ))}
    </ul>
  );
}
