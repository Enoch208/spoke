"use client";

import type { ClientOutput } from "@spoke/protocol";
import { useRef, useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { useFeatureGate } from "@/components/app/feature-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RadioGroup } from "@/components/ui/radio";
import { useCopy } from "@/components/ui/use-copy";
import { useClientContext } from "@/lib/client/provider";
import { common, fill, toasts } from "@/lib/copy";
import { featureStatus } from "@/lib/features";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { exportCopy as copy } from "../copy/reputation";
import { DialogError, DialogSkeleton } from "../shared/dialog-states";

type Profile = ClientOutput<"reputation.mine">;

const recordOf = (profile: Profile, sample: boolean) => ({
  ...(sample ? { notice: copy.sampleMark } : {}),
  subject: profile.subject,
  handle: profile.handle,
  methodologyVersion: profile.methodologyVersion,
  evidencePeriod: profile.evidencePeriod,
  settledConversions: profile.settledConversions,
  netAttributedValue: profile.netAttributedValue,
  settledCommission: profile.settledCommission,
  merchantCount: profile.merchantCount,
  campaignCount: profile.campaignCount,
  refundAdjustment: profile.refundAdjustment,
  lastIndexedBlock: profile.lastIndexedBlock,
  verificationTier: profile.verificationTier,
  receipts: profile.evidence.items
    .filter((receipt) => receipt.state === "FINALIZED")
    .map((receipt) => ({
      saleId: receipt.saleId,
      campaignId: receipt.campaignId,
      chainId: receipt.chainId,
      policyHash: receipt.policyHash,
      purchaseTx: receipt.purchaseTx.hash,
      finalizeTx: receipt.finalizeTx?.hash ?? null,
    })),
});

const save = (text: string, name: string, type: string) => {
  const href = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(href);
};

export default function ExportRecordDialog({ isTop, close }: ModalComponentProps<"M-37">) {
  const { mode, client } = useClientContext();
  const gate = useFeatureGate();
  const copyText = useCopy();
  const pushToast = useUiStore((state) => state.pushToast);
  const focus = useRef<HTMLButtonElement>(null);
  const [format, setFormat] = useState<"proof" | "credential">("proof");
  const profile = useClientQuery("reputation.mine", {});
  const data = profile.data;
  const sample = mode === "demo";
  const name = (extension: string) =>
    `spoke-record-${data?.handle ?? "account"}-${data?.lastIndexedBlock ?? "demo"}.${extension}`;
  const done = () =>
    pushToast({
      id: "T-36",
      tone: "success",
      message: toasts["T-36"].copy.record,
      durationMs: toasts["T-36"].duration,
    });
  const downloadProof = () => {
    if (!data) return;
    save(JSON.stringify(recordOf(data, sample), null, 2), name("json"), "application/json");
    done();
  };
  const downloadCsv = () => {
    if (!data) return;
    const rows = recordOf(data, sample).receipts.map((row) =>
      [
        row.saleId,
        row.campaignId,
        String(row.chainId),
        row.policyHash,
        row.purchaseTx,
        row.finalizeTx ?? "",
      ].join(","),
    );
    const head = sample ? [copy.sampleMark] : [];
    save(
      [...head, "saleId,campaignId,chainId,policyHash,purchaseTx,finalizeTx", ...rows].join("\n"),
      name("csv"),
      "text/csv",
    );
    done();
  };
  const failed = (error: unknown) => {
    pushToast({
      id: "T-06",
      tone: "error",
      message: fill(toasts["T-06"].copy, {
        verb: copy.verb,
        reason: error instanceof Error ? error.message : "",
      }),
      durationMs: null,
    });
    return null;
  };
  const downloadCredential = () => {
    gate("credentials", () => {
      if (!client) return;
      void client
        .call("reputation.exportCredential", {})
        .catch(failed)
        .then((credential) => {
          if (!credential) return;
          save(
            JSON.stringify({ notice: copy.sampleMark, credential }, null, 2),
            name("credential.json"),
            "application/json",
          );
          done();
        });
    });
  };
  const empty = data !== undefined && data.settledConversions === 0;
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="md"
      inert={!isTop}
      initialFocus={focus}
      title={copy.title}
      footer={
        format === "proof" ? (
          <>
            <Button
              variant="secondary"
              disabled={!data}
              onClick={() => {
                if (data)
                  void copyText(JSON.stringify(recordOf(data, sample), null, 2), copy.copied);
              }}
            >
              {copy.copy}
            </Button>
            <Button variant="secondary" disabled={!data} onClick={downloadCsv}>
              {copy.csv}
            </Button>
            <Button ref={focus} disabled={!data} onClick={downloadProof}>
              {copy.download}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              {common.cancel}
            </Button>
            <Button ref={focus} onClick={downloadCredential}>
              {copy.download}
            </Button>
          </>
        )
      }
    >
      {profile.isPending ? <DialogSkeleton /> : null}
      {profile.error ? (
        <DialogError error={profile.error} retry={() => void profile.refetch()} />
      ) : null}
      {data ? (
        <div className="grid gap-5">
          <RadioGroup
            label={copy.formats}
            value={format}
            onValueChange={setFormat}
            options={[
              { value: "proof", label: copy.proof, description: copy.proofHelp },
              {
                value: "credential",
                label: (
                  <span className="inline-flex items-center gap-2">
                    {copy.credential}
                    {featureStatus("credentials") === "live" ? null : (
                      <Badge tone="lilac">{copy.demo}</Badge>
                    )}
                  </span>
                ),
                description: copy.credentialHelp,
              },
            ]}
          />
          {empty ? <p className="text-amber-ink text-sm">{copy.empty}</p> : null}
          <div className="bg-soft grid gap-1 rounded-xl p-4 text-sm">
            <p className="text-ink font-medium">{copy.fields}</p>
            <p className="text-body">{copy.fieldsList}</p>
          </div>
          <p className="text-subtle text-sm">
            {sample ? copy.noteDemo : fill(copy.note, { block: data.lastIndexedBlock ?? "" })}
          </p>
        </div>
      ) : null}
    </Dialog>
  );
}
