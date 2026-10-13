"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageSkeleton, ProductPage } from "@/components/product/page";
import { demoPageCopy, personaCards } from "@/components/public/demo/demo-copy";
import { LiveVsDemo } from "@/components/public/demo/live-vs-demo";
import { PersonaCard } from "@/components/public/demo/persona-card";
import { useStorageWorks, useWorldCounts } from "@/components/public/demo/use-world-counts";
import { Callout } from "@/components/public/shared/callout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fill } from "@/lib/copy";
import { pluralize } from "@/lib/format";
import { isPersona, personaHomes } from "@/lib/demo/landing";
import { useDemoMode } from "@/lib/demo/use-demo-mode";
import { routes } from "@/lib/routes";
import { useDemoStore } from "@/lib/stores/demo";
import { personas, useModeStore } from "@/lib/stores/mode";

function InDemoBar() {
  const persona = useModeStore((state) => state.persona);
  const { exitDemo } = useDemoMode();
  const [confirming, setConfirming] = useState(false);
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-display text-h4 text-ink font-medium">
          {fill(demoPageCopy.inDemo, { persona: personaCards[persona].title.toLowerCase() })}
        </p>
        <p className="text-subtle text-sm">{demoPageCopy.inDemoBody}</p>
      </div>
      {confirming ? (
        <Callout
          tone="caution"
          actions={
            <>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  useDemoStore.getState().reset();
                  window.location.assign(personaHomes[persona]);
                }}
              >
                {demoPageCopy.reset}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                }}
              >
                {demoPageCopy.resetCancel}
              </Button>
            </>
          }
        >
          {demoPageCopy.resetConfirm}
        </Callout>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={personaHomes[persona]}>{demoPageCopy.continue}</Link>
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setConfirming(true);
          }}
        >
          {demoPageCopy.reset}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            exitDemo({});
          }}
        >
          {demoPageCopy.exit}
        </Button>
      </div>
    </Card>
  );
}

function Chooser() {
  const search = useSearchParams();
  const next = search.get("next");
  const mode = useModeStore((state) => state.mode);
  const current = useModeStore((state) => state.persona);
  const { enterDemo } = useDemoMode();
  const { state, retry } = useWorldCounts();
  const storageWorks = useStorageWorks();
  const requested = search.get("persona");
  const entered = useRef(false);
  useEffect(() => {
    if (entered.current || !isPersona(requested)) return;
    entered.current = true;
    enterDemo({ persona: requested, next });
  }, [requested, next, enterDemo]);
  const inDemo = mode === "demo";
  return (
    <ProductPage
      title={demoPageCopy.title}
      description={
        state.status === "ready"
          ? fill(demoPageCopy.subtitle, {
              merchants: pluralize(state.counts.merchants, "sample merchant"),
              distributors: pluralize(state.counts.distributors, "sample distributor"),
              sales: pluralize(state.counts.sales, "sample sale"),
            })
          : demoPageCopy.subtitleLoading
      }
    >
      {inDemo ? <InDemoBar /> : null}
      {state.status === "failed" ? (
        <Callout
          tone="danger"
          actions={
            <Button size="sm" variant="secondary" onClick={retry}>
              {demoPageCopy.tryAgain}
            </Button>
          }
        >
          {demoPageCopy.failed}
        </Callout>
      ) : null}
      {storageWorks ? null : <Callout tone="caution">{demoPageCopy.storageBlocked}</Callout>}
      <div className="grid gap-4 lg:grid-cols-3">
        {personas.map((persona) => (
          <PersonaCard
            key={persona}
            persona={persona}
            current={inDemo && persona === current}
            loading={state.status === "loading"}
            onEnter={() => {
              enterDemo({ persona, next });
            }}
          />
        ))}
      </div>
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={() => {
            enterDemo({ persona: "buyer", next: routes.explore });
          }}
        >
          {demoPageCopy.justBrowse}
        </Button>
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-h4 text-ink font-medium">{demoPageCopy.howHeading}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {demoPageCopy.how.map((item) => (
            <Card key={item.title} className="flex flex-col gap-1.5">
              <h3 className="text-ink text-base font-medium">{item.title}</h3>
              <p className="text-body text-sm">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>
      <LiveVsDemo />
    </ProductPage>
  );
}

function Exit() {
  const search = useSearchParams();
  const { exitDemo } = useDemoMode();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    exitDemo({ next: search.get("next") });
  }, [exitDemo, search]);
  return <PageSkeleton />;
}

export function DemoPage({ exit = false }: { exit?: boolean }) {
  return exit ? <Exit /> : <Chooser />;
}
