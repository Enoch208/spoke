"use client";

import { Alert01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatTokenAmount } from "@spoke/protocol";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio";
import { fill } from "@/lib/copy";
import { formatAmount, formatBps, type TokenLike } from "@/lib/format";
import { studioCopy } from "./copy";
import type { StudioTerms } from "./terms";
import type { TermsCheck, TermsVariant } from "./validate";

type Props = {
  terms: StudioTerms;
  onChange: (terms: StudioTerms) => void;
  check: TermsCheck;
  showErrors: boolean;
  priceMinor: bigint | null;
  token: TokenLike;
  variant: TermsVariant;
  disabled?: boolean | undefined;
};

const copy = studioCopy.commission;

const plainAmount = (minor: bigint, token: TokenLike) =>
  formatTokenAmount(minor, token.decimals).replaceAll(",", "");

function CapHelper({ check, priceMinor, token }: Pick<Props, "check" | "priceMinor" | "token">) {
  const resolved = check.pricing;
  if (!resolved || priceMinor === null || resolved.formulaMinor === null) return null;
  const formula = formatAmount(resolved.formulaMinor, token);
  if (resolved.capMinor >= resolved.formulaMinor)
    return fill(copy.capAtFormula, {
      price: formatAmount(priceMinor, token),
      rate: formatBps(resolved.rateBps),
      formula,
    });
  const effectiveBps = priceMinor === 0n ? 0 : Number((resolved.capMinor * 10_000n) / priceMinor);
  return fill(copy.capBelowFormula, {
    cap: formatAmount(resolved.capMinor, token),
    formula,
    effective: formatBps(effectiveBps),
  });
}

export function CommissionFields(props: Props) {
  const { terms, onChange, check, showErrors, priceMinor, token, variant, disabled } = props;
  const rateBps = check.pricing?.rateBps ?? null;
  const formulaMinor = check.pricing?.formulaMinor ?? null;
  const formulaText = formulaMinor === null ? "" : plainAmount(formulaMinor, token);
  const capInput = (
    <Input
      mono
      inputMode="decimal"
      suffix={token.symbol}
      disabled={disabled}
      value={terms.cap.mode === "fixed" ? terms.cap.text : formulaText}
      onChange={(event) => {
        onChange({ ...terms, cap: { mode: "fixed", text: event.target.value } });
      }}
    />
  );
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        label={copy.rate}
        helper={copy.rateHelper}
        error={showErrors ? check.errors.rate : undefined}
      >
        <Input
          mono
          inputMode="decimal"
          suffix="%"
          maxLength={6}
          disabled={disabled}
          value={terms.rate}
          onChange={(event) => {
            onChange({ ...terms, rate: event.target.value });
          }}
        />
      </Field>
      {variant === "campaign" ? (
        <Field
          label={copy.cap}
          helper={<CapHelper check={check} priceMinor={priceMinor} token={token} />}
          error={showErrors ? check.errors.cap : undefined}
        >
          {capInput}
        </Field>
      ) : (
        <Field label={copy.capRule} error={showErrors ? check.errors.cap : undefined}>
          <RadioGroup
            label={copy.capRule}
            value={terms.cap.mode}
            onValueChange={(mode) => {
              onChange({
                ...terms,
                cap: mode === "formula" ? { mode } : { mode, text: formulaText || "5" },
              });
            }}
            options={[
              { value: "formula", label: copy.capFormula, description: copy.capFormulaHelper },
              { value: "fixed", label: copy.capFixed },
            ]}
          />
          {terms.cap.mode === "fixed" ? <div className="mt-2">{capInput}</div> : null}
        </Field>
      )}
      {rateBps !== null && rateBps > 5_000 ? (
        <p className="bg-amber-soft text-amber-ink flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm sm:col-span-2">
          <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} className="mt-0.5" />
          {copy.rateHigh}
        </p>
      ) : null}
    </div>
  );
}
