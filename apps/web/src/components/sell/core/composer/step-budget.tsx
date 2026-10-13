"use client";

import { InformationCircleIcon, LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatTokenAmount } from "@spoke/protocol";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fill, required } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { composerCopy } from "./copy";
import { WalletBalances, type Balances } from "./budget-funds";
import type { ComposerToken, Derived } from "./derive";
import type { ComposerFields } from "./fields";

const copy = composerCopy.budget;

const plain = (minor: bigint, token: ComposerToken) =>
  formatTokenAmount(minor, token.decimals).replaceAll(",", "");

function Coverage({
  derived,
  token,
  returnUnused,
}: {
  derived: Derived;
  token: ComposerToken;
  returnUnused: boolean;
}) {
  const reward = derived.check.pricing?.rewardMinor ?? null;
  const deposit = derived.depositMinor;
  const limit = derived.limitMinor;
  if (!reward || deposit === null || deposit === 0n) return null;
  return (
    <div className="bg-lime-soft/60 flex flex-col gap-2 rounded-2xl px-4 py-3">
      <p className="text-ink text-sm">
        {fill(copy.coverage, {
          deposit: formatAmount(deposit, token),
          count: (deposit / reward).toString(),
          reward: formatAmount(reward, token),
        })}
      </p>
      {limit !== null && limit > 0n ? (
        <>
          <p className="text-body text-sm">
            {fill(copy.limitCoverage, { count: (limit / reward).toString() })}
          </p>
          <ProgressBar
            value={Number((deposit * 1000n) / limit)}
            max={1000}
            tone="lime"
            label={copy.coverageLabel}
          />
        </>
      ) : null}
      {returnUnused ? <p className="text-subtle text-sm">{copy.returnUnused}</p> : null}
    </div>
  );
}

export function BudgetStep({
  fields,
  onPatch,
  derived,
  token,
  balances,
  showErrors,
}: {
  fields: ComposerFields;
  onPatch: (patch: Partial<ComposerFields>) => void;
  derived: Derived;
  token: ComposerToken;
  balances: Balances;
  showErrors: boolean;
}) {
  const reward = derived.check.pricing?.rewardMinor ?? null;
  const usable = reward !== null && reward > 0n;
  const limitCap = derived.limitMinor;
  const maxDeposit =
    balances.tokenMinor === null
      ? null
      : fields.limit.touched && limitCap !== null && limitCap < balances.tokenMinor
        ? limitCap
        : balances.tokenMinor;
  const setLimit = (multiplier: bigint) => {
    if (derived.depositMinor === null) return;
    onPatch({ limit: { touched: true, text: plain(derived.depositMinor * multiplier, token) } });
  };
  const errors = showErrors ? derived.budget : null;
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
          {copy.title}
        </h2>
        <div className="bg-sky-soft text-sky-ink mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
          />
          <span>
            {required.depositFirst} {required.demoToken}
          </span>
        </div>
      </div>
      <WalletBalances balances={balances} token={token} needMinor={derived.depositMinor} />
      <Field label={copy.deposit} helper={copy.depositHelper} error={errors?.deposit}>
        <Input
          mono
          inputMode="decimal"
          suffix={token.symbol}
          value={fields.deposit}
          onChange={(event) => {
            onPatch({ deposit: event.target.value });
          }}
        />
      </Field>
      <div className="-mt-2 flex flex-wrap gap-2">
        {[25n, 50n, 100n].map((count) => (
          <Button
            key={count.toString()}
            variant="secondary"
            size="sm"
            disabled={!usable}
            onClick={() => {
              if (reward) onPatch({ deposit: plain(reward * count, token) });
            }}
          >
            {fill(copy.quick, {
              count: count.toString(),
              amount: reward ? formatAmount(reward * count, token) : "—",
            })}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          disabled={maxDeposit === null || maxDeposit === 0n}
          onClick={() => {
            if (maxDeposit !== null) onPatch({ deposit: plain(maxDeposit, token) });
          }}
        >
          {copy.max}
        </Button>
      </div>
      <Field label={copy.limit} helper={copy.limitHelper} error={errors?.limit}>
        <Input
          mono
          inputMode="decimal"
          suffix={token.symbol}
          value={derived.limitText}
          onChange={(event) => {
            onPatch({ limit: { touched: true, text: event.target.value } });
          }}
        />
      </Field>
      <div className="-mt-2 flex flex-wrap gap-2">
        {(
          [
            [1n, copy.sameAsDeposit],
            [2n, copy.twice],
            [5n, copy.fiveTimes],
          ] as const
        ).map(([multiplier, label]) => (
          <Button
            key={label}
            variant="secondary"
            size="sm"
            disabled={derived.depositMinor === null}
            onClick={() => {
              setLimit(multiplier);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <Coverage
        derived={derived}
        token={token}
        returnUnused={fields.terms.shortPathMode === "RETURN_UNUSED"}
      />
      <div className="border-hairline flex flex-col gap-3 border-t pt-4">
        <h3 className="text-ink text-base font-medium">{copy.alerts}</h3>
        <Field label={copy.alertLow} helper={copy.alertHelper} error={errors?.alert}>
          <Input
            mono
            inputMode="numeric"
            className="max-w-28"
            value={fields.alertSales}
            onChange={(event) => {
              onPatch({ alertSales: event.target.value });
            }}
          />
        </Field>
        <div className="bg-soft flex items-start gap-3 rounded-xl px-3 py-2.5">
          <HugeiconsIcon
            icon={LockIcon}
            size={16}
            strokeWidth={1.8}
            className="text-subtle mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="text-ink text-sm">{copy.alertExhausted}</p>
            <p className="text-subtle text-sm">{copy.alertExhaustedHelper}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
