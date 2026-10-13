"use client";

import type { CommissionPolicy } from "@spoke/protocol";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { fill } from "@/lib/copy";
import type { TokenLike } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { CommissionFields } from "./commission-fields";
import { studioCopy } from "./copy";
import { HoldField } from "./hold-field";
import { LevelsControl } from "./levels-control";
import { RewardLine } from "./reward-line";
import { ShortPathChoice } from "./short-path";
import { splitPreview } from "./split";
import type { StudioTerms } from "./terms";
import type { TermsCheck, TermsVariant } from "./validate";
import { WeightsEditor } from "./weights-editor";
import { presetWeights } from "./weights";

export type CommissionStudioProps = {
  terms: StudioTerms;
  onChange: (terms: StudioTerms) => void;
  check: TermsCheck;
  policy: CommissionPolicy | null;
  showErrors: boolean;
  priceMinor: bigint | null;
  token: TokenLike;
  variant: TermsVariant;
  framed?: boolean;
  slider?: boolean;
  showHold?: boolean;
  disabled?: boolean | undefined;
};

function Section({
  title,
  framed,
  children,
}: {
  title: string;
  framed: boolean;
  children: ReactNode;
}) {
  const body = (
    <>
      <h2
        className={cx(
          "text-ink mb-4 font-medium",
          framed ? "font-display text-h4 tracking-[-0.01em]" : "text-base",
        )}
      >
        {title}
      </h2>
      {children}
    </>
  );
  return framed ? (
    <Card padding="lg">{body}</Card>
  ) : (
    <section className="border-hairline border-t pt-5 first:border-t-0 first:pt-0">{body}</section>
  );
}

export function CommissionStudio(props: CommissionStudioProps) {
  const { terms, onChange, check, policy, showErrors, priceMinor, token, variant } = props;
  const framed = props.framed ?? true;
  const pushToast = useUiStore((state) => state.pushToast);
  const amounts =
    policy && priceMinor !== null
      ? splitPreview(priceMinor, policy, policy.weightsBps.length).amounts
      : null;
  const changeLevels = (levels: number) => {
    const previous = terms;
    onChange({ ...terms, weights: presetWeights("nearestHeavy", levels) });
    pushToast({
      id: "T-02",
      subject: "weights-reset",
      tone: "info",
      message: fill(studioCopy.levels.reset, { count: String(levels) }),
      durationMs: 6000,
      action: {
        label: studioCopy.levels.undo,
        run: () => {
          onChange(previous);
        },
      },
    });
  };
  return (
    <div className={cx("flex flex-col", framed ? "gap-4" : "gap-5")}>
      <Section title={studioCopy.commission.title} framed={framed}>
        <div className="flex flex-col gap-4">
          <CommissionFields {...props} />
          <RewardLine check={check} token={token} showErrors={showErrors} />
        </div>
      </Section>
      <Section title={studioCopy.weights.title} framed={framed}>
        <div className="flex flex-col gap-5">
          <LevelsControl
            levels={terms.weights.length}
            onChange={changeLevels}
            disabled={props.disabled}
          />
          <WeightsEditor
            terms={terms}
            onChange={onChange}
            check={check}
            showErrors={showErrors}
            amounts={amounts}
            token={token}
            slider={props.slider ?? false}
            disabled={props.disabled}
          />
        </div>
      </Section>
      <Section title={studioCopy.shortPath.title} framed={framed}>
        <ShortPathChoice
          value={terms.shortPathMode}
          policy={policy}
          priceMinor={priceMinor}
          token={token}
          disabled={props.disabled}
          onChange={(shortPathMode) => {
            onChange({ ...terms, shortPathMode });
          }}
        />
      </Section>
      {(props.showHold ?? variant === "template") ? (
        <Section title={studioCopy.hold.label} framed={framed}>
          <HoldField
            value={terms.hold}
            hideLabel
            error={showErrors ? check.errors.hold : undefined}
            disabled={props.disabled}
            onChange={(hold) => {
              onChange({ ...terms, hold });
            }}
          />
        </Section>
      ) : null}
    </div>
  );
}
