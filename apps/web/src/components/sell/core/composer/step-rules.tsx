"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio";
import { disclosures, fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { holdWords } from "./plain-terms";
import { useModeStore } from "@/lib/stores/mode";
import { useUiStore } from "@/lib/stores/ui";
import { HoldField } from "../studio/hold-field";
import { rulesCopy } from "./copy-rules";
import type { Derived } from "./derive";
import { EndField } from "./end-field";
import type { ComposerFields, ComposerMode } from "./fields";
import { LockedRow, PreviewRow, RuleGroup } from "./rules-rows";

const copy = rulesCopy;

export function RulesStep({
  fields,
  onPatch,
  derived,
  mode,
  showErrors,
  now,
}: {
  fields: ComposerFields;
  onPatch: (patch: Partial<ComposerFields>) => void;
  derived: Derived;
  mode: ComposerMode;
  showErrors: boolean;
  now: number;
}) {
  const appMode = useModeStore((state) => state.mode);
  const open = useUiStore((state) => state.open);
  const hold = derived.check.resolved?.holdSeconds ?? null;
  const inviteLive = appMode === "demo";
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <RuleGroup title={copy.dates}>
        <p className="text-body text-sm">{copy.goesLive}</p>
        {mode === "create" ? (
          <EndField
            value={fields.end}
            now={now}
            error={showErrors ? derived.rules.end : undefined}
            onChange={(end) => {
              onPatch({ end });
            }}
          />
        ) : derived.endsAt !== null ? (
          <p className="text-body text-sm">{`${copy.ends} ${formatDateTime(new Date(derived.endsAt))}`}</p>
        ) : null}
      </RuleGroup>
      <RuleGroup title={copy.hold}>
        <HoldField
          hideLabel
          value={fields.terms.hold}
          error={showErrors ? derived.check.errors.hold : undefined}
          onChange={(value) => {
            onPatch({ terms: { ...fields.terms, hold: value } });
          }}
        />
        {hold !== null ? (
          <div className="bg-soft rounded-xl px-3 py-2.5">
            <p className="text-subtle text-xs">{copy.refunds}</p>
            <p className="text-ink text-sm">{fill(copy.refundTerms, { hold: holdWords(hold) })}</p>
          </div>
        ) : null}
      </RuleGroup>
      {mode === "create" ? (
        <>
          <RuleGroup title={copy.access}>
            <RadioGroup<"anyone" | "invite">
              label={copy.access}
              value={fields.inviteOnly ? "invite" : "anyone"}
              onValueChange={(value) => {
                onPatch({ inviteOnly: value === "invite" });
              }}
              options={[
                { value: "anyone", label: copy.anyone, description: copy.anyoneHelper },
                {
                  value: "invite",
                  label: copy.inviteOnly,
                  description: inviteLive ? copy.inviteHelper : copy.inviteDemoOnly,
                  disabled: !inviteLive,
                },
              ]}
            />
            {inviteLive ? null : (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => {
                  open("M-44", { featureKey: "cohorts" });
                }}
              >
                {copy.tryDemo}
              </Button>
            )}
          </RuleGroup>
          <RuleGroup title={copy.eligibility}>
            <ul className="flex flex-col gap-2">
              <LockedRow>{copy.onePurchase}</LockedRow>
              <LockedRow>{copy.noSelfPay}</LockedRow>
              <PreviewRow>{copy.discount}</PreviewRow>
            </ul>
          </RuleGroup>
          <RuleGroup title={copy.excluded}>
            <ul className="flex flex-col gap-2">
              <LockedRow>{copy.excludeBuyer}</LockedRow>
              <LockedRow>{copy.excludeMerchant}</LockedRow>
              <PreviewRow>{copy.moreExclusions}</PreviewRow>
            </ul>
          </RuleGroup>
          <RuleGroup title={copy.regions}>
            <p className="text-ink text-sm">{copy.regionsValue}</p>
            <p className="text-subtle text-sm">{copy.regionsNote}</p>
          </RuleGroup>
          <RuleGroup title={copy.disclosure}>
            <p className="bg-soft text-ink rounded-xl px-3 py-2.5 text-sm">
              {disclosures["D-02"].short}
            </p>
            <p className="text-subtle text-sm">{copy.disclosureHelper}</p>
          </RuleGroup>
        </>
      ) : null}
    </Card>
  );
}
