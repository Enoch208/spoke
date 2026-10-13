"use client";

import { demoToken } from "@spoke/protocol";
import { useEffect, useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Drawer } from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ModeBadge } from "@/components/ui/mode-badge";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { useModeStore } from "@/lib/stores/mode";
import { useUiStore } from "@/lib/stores/ui";
import { CommissionStudio } from "./commission-studio";
import { simulatorCopy } from "./copy-simulator";
import { CrossCheckNote } from "./cross-check-note";
import { templatePolicy, termsFromPolicy } from "./policy";
import { SimulatorFooter } from "./simulator-footer";
import { SimulatorResults } from "./simulator-results";
import { SimulatorScenarios, type ScenarioInput } from "./simulator-scenarios";
import type { CrossCheck } from "./split";
import { defaultTerms, parseAmount } from "./terms";
import { useCrossCheck } from "./use-cross-check";
import { checkTerms } from "./validate";

const copy = simulatorCopy;
const zeroAddress = "0x0000000000000000000000000000000000000000";

export default function PolicySimulator({ props, isTop, close }: ModalComponentProps<"M-27">) {
  const mode = useModeStore((state) => state.mode);
  const open = useUiStore((state) => state.open);
  const tokens = useClientQuery("tokens.list", {}, { enabled: !props.policy });
  const address =
    props.policy?.rewardToken ??
    tokens.data?.find((token) => token.role !== "payment")?.address ??
    zeroAddress;
  const token = { address, symbol: demoToken.symbol, decimals: demoToken.decimals };
  const readOnly = props.mode === "readOnly";
  const [initial] = useState(() =>
    props.policy ? termsFromPolicy(props.policy, token, null) : defaultTerms,
  );
  const [terms, setTerms] = useState(initial);
  const [price, setPrice] = useState("40.00");
  const [scenario, setScenario] = useState<ScenarioInput>(() => ({
    pathLength: initial.weights.length,
    buyerOnPath: false,
    sameWallet: false,
    budget: "",
  }));
  const [checkResult, setCheckResult] = useState<CrossCheck | null>(null);
  const crossCheck = useCrossCheck();
  const parsedPrice = parseAmount(price, token.decimals);
  const priceMinor = parsedPrice.ok && parsedPrice.value > 0n ? parsedPrice.value : null;
  const check = checkTerms(terms, { priceMinor, token, variant: "template" });
  const policy = check.resolved ? templatePolicy(check.resolved, terms.shortPathMode, token) : null;
  const budget = parseAmount(scenario.budget, token.decimals);
  const dirty = JSON.stringify(terms) !== JSON.stringify(initial);
  const [openPolicy] = useState(() => policy);
  useEffect(() => {
    if (!openPolicy) return;
    void crossCheck(40_000_000n, openPolicy).then(setCheckResult);
  }, [crossCheck, openPolicy]);
  const dismiss = () => {
    if (dirty && props.onApply && !readOnly)
      open("M-43", { subject: copy.leaveSubject, onContinue: close });
    else close();
  };
  const priceError = parsedPrice.ok
    ? parsedPrice.value === 0n
      ? copy.priceError
      : undefined
    : parsedPrice.reason === "decimals"
      ? fill(copy.priceDecimals, { symbol: token.symbol, decimals: String(token.decimals) })
      : copy.priceError;
  return (
    <Drawer
      wide
      open
      inert={!isTop}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      title={copy.title}
      subtitle={readOnly ? copy.readOnlySubtitle : copy.editSubtitle}
      badge={<ModeBadge mode={mode} />}
      footer={
        <SimulatorFooter
          readOnly={readOnly}
          canApply={Boolean(props.onApply)}
          policy={policy}
          priceMinor={priceMinor}
          onCheck={setCheckResult}
          onApply={(applied) => {
            props.onApply?.(applied);
            close();
          }}
          onReset={() => {
            setTerms(initial);
          }}
          onClose={close}
        />
      }
    >
      <div className="flex flex-col gap-6">
        <Field label={copy.price} error={priceError}>
          <Input
            mono
            inputMode="decimal"
            suffix={token.symbol}
            value={price}
            onChange={(event) => {
              setPrice(event.target.value);
            }}
          />
        </Field>
        <CommissionStudio
          terms={terms}
          onChange={setTerms}
          check={check}
          policy={policy}
          showErrors
          priceMinor={priceMinor}
          token={token}
          variant="template"
          framed={false}
          slider
          showHold={false}
          disabled={readOnly}
        />
        <SimulatorScenarios value={scenario} onChange={setScenario} token={token} />
        <section className="flex flex-col gap-3">
          <h3 className="text-ink text-base font-medium">{copy.results}</h3>
          <CrossCheckNote result={checkResult} messages={copy} />
          <SimulatorResults
            policy={policy}
            priceMinor={priceMinor}
            token={token}
            scenario={{
              pathLength: scenario.pathLength,
              buyerOnPath: scenario.buyerOnPath,
              sameWallet: scenario.sameWallet,
              budgetMinor: budget.ok ? budget.value : null,
            }}
          />
        </section>
      </div>
    </Drawer>
  );
}
