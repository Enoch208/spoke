"use client";

import {
  Megaphone01Icon,
  Share08Icon,
  ShoppingBag01Icon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useClientMutation } from "@/lib/query/use-client";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";

type Intent = "buy" | "earn" | "sell";

const intents: readonly { value: Intent; title: string; body: string; icon: IconSvgElement }[] = [
  {
    value: "earn",
    title: "Share and earn",
    body: "Create links for products you’d recommend anyway and earn on settled sales.",
    icon: Share08Icon,
  },
  {
    value: "buy",
    title: "Buy a product",
    body: "Pay in testnet SDUSD with a refund window and a receipt you can verify.",
    icon: ShoppingBag01Icon,
  },
  {
    value: "sell",
    title: "Launch a campaign",
    body: "Fund a reward budget and let the people who love your product carry it.",
    icon: Megaphone01Icon,
  },
];

const destination = { buy: "/explore", earn: "/earn/opportunities", sell: "/sell/setup" } as const;

export function WelcomePage() {
  const [intent, setIntent] = useState<Intent>("earn");
  const [handle, setHandle] = useState("");
  const update = useClientMutation("account.updateProfile", ["account.me"]);
  const kind = useSessionStore((state) => state.accountKind);
  const router = useRouter();
  const finish = async () => {
    const result = await update
      .mutateAsync({ intent, ...(handle ? { handle } : {}), onboardingCompleted: true })
      .catch(() => null);
    if (result) router.push(destination[intent]);
  };
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 py-4">
      <header>
        <h1 className="font-display text-title text-ink font-medium tracking-[-0.02em]">
          Welcome to Spoke
        </h1>
        <p className="text-body mt-2">
          Tell us what you’re here for and we’ll start you in the right place. You can do all three
          with one account.
        </p>
      </header>
      <fieldset>
        <legend className="text-ink mb-3 font-medium">What brings you here?</legend>
        <div role="radiogroup" className="grid gap-3">
          {intents.map((option) => {
            const selected = intent === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setIntent(option.value);
                }}
                className={cx(
                  "ease-spring flex items-start gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-[423ms]",
                  selected
                    ? "border-ink bg-surface shadow-[0_0_0_1px_var(--color-ink)]"
                    : "border-hairline bg-surface hover:border-line",
                )}
              >
                <span
                  className={cx(
                    "ease-spring flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-[423ms]",
                    selected ? "bg-ink text-page" : "bg-pill text-ink",
                  )}
                >
                  <HugeiconsIcon
                    icon={option.icon}
                    size={20}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
                <span>
                  <span className="text-ink block font-medium">{option.title}</span>
                  <span className="text-body mt-0.5 block text-sm">{option.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field label="Handle" optional helper="Shown on links you share. You can choose one later.">
        <Input
          value={handle}
          placeholder="yourname"
          onChange={(event) => {
            setHandle(event.target.value);
          }}
        />
      </Field>
      {kind === "passkey" ? (
        <Card className="flex items-start gap-4">
          <span className="bg-lilac-soft text-ink flex size-10 shrink-0 items-center justify-center rounded-xl">
            <HugeiconsIcon
              icon={SecurityCheckIcon}
              size={20}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h2 className="text-ink font-medium">Back up before your account holds anything</h2>
            <p className="text-body mt-1 text-sm">
              Your recovery phrase is the way back if you lose this passkey.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => {
                useUiStore.getState().open("M-04", { mode: "backup", origin: "onboarding" });
              }}
            >
              Back up recovery phrase
            </Button>
          </div>
        </Card>
      ) : null}
      {update.error ? (
        <p role="alert" className="text-pink-ink text-sm">
          {update.error.message}
        </p>
      ) : null}
      <Button size="lg" block loading={update.isPending} onClick={() => void finish()}>
        Continue
      </Button>
    </div>
  );
}
