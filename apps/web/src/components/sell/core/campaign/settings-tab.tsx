"use client";

import { useState, type ReactNode } from "react";
import type { TokenLike } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CampaignStateKeyChip } from "@/components/product/campaign-state-chip";
import { fill, type CampaignStateKey } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientMutation } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { settingsCopy as copy } from "../copy/campaign";
import { canEnd, canPause, canResume, canTopUp, canWithdraw } from "../shared/campaign-rules";

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card
      padding="lg"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h2 className="text-ink font-medium">{title}</h2>
        {body ? <div className="text-subtle mt-1 text-sm">{body}</div> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-end gap-2">{children}</div>
    </Card>
  );
}

export function SettingsTab({
  campaignId,
  stateKey,
  available,
  token,
  alertSales,
}: {
  campaignId: string;
  stateKey: CampaignStateKey;
  available: bigint;
  token: TokenLike;
  alertSales: number | null;
}) {
  const ui = useUiStore.getState;
  const update = useClientMutation("campaigns.updateSettings", ["campaigns"]);
  const [edited, setAlert] = useState<string | null>(null);
  const alert = edited ?? (alertSales === null ? "" : String(alertSales));
  const value = Number(alert);
  const invalid = !/^\d+$/.test(alert) || value < 1 || value > 50;
  return (
    <div className="space-y-4">
      <Section title={copy.status} body={copy.statusBody}>
        <CampaignStateKeyChip stateKey={stateKey} />
        {canPause(stateKey) ? (
          <Button
            variant="secondary"
            onClick={() => {
              ui().open("M-25", { campaignId, mode: "pause" });
            }}
          >
            {copy.pause}
          </Button>
        ) : null}
        {canResume(stateKey) ? (
          <Button
            onClick={() => {
              ui().open("M-25", { campaignId, mode: "resume" });
            }}
          >
            {copy.resume}
          </Button>
        ) : null}
      </Section>
      <Section
        title={copy.budget}
        body={fill(copy.budgetBody, { amount: formatAmount(available, token) })}
      >
        {canTopUp(stateKey) ? (
          <Button
            variant="secondary"
            onClick={() => {
              ui().open("M-23", { campaignId });
            }}
          >
            {copy.addBudget}
          </Button>
        ) : null}
        {canWithdraw(stateKey, available) ? (
          <Button
            variant="secondary"
            onClick={() => {
              ui().open("M-24", { campaignId });
            }}
          >
            {copy.withdraw}
          </Button>
        ) : null}
      </Section>
      <Section title={copy.alerts} body={copy.alertBody}>
        <Field
          label={copy.alertLabel}
          error={invalid ? copy.alertError : undefined}
          className="w-full sm:w-80"
        >
          <Input
            value={alert}
            inputMode="numeric"
            mono
            onChange={(event) => {
              setAlert(event.target.value);
            }}
          />
        </Field>
        <Button
          variant="secondary"
          disabled={invalid || value === alertSales}
          loading={update.isPending}
          onClick={() => {
            update.mutate(
              { campaignId, budgetAlertSales: value },
              {
                onSuccess: () => {
                  useUiStore.getState().pushToast({
                    id: "T-02",
                    tone: "success",
                    message: copy.saved,
                    durationMs: 3000,
                  });
                },
              },
            );
          }}
        >
          {copy.save}
        </Button>
      </Section>
      {canEnd(stateKey) ? (
        <Section title={copy.danger} body={copy.dangerBody}>
          <Button
            variant="danger"
            onClick={() => {
              ui().open("M-26", { campaignId });
            }}
          >
            {copy.end}
          </Button>
        </Section>
      ) : null}
    </div>
  );
}
