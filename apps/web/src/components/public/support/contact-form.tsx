"use client";

import { useMutation } from "@tanstack/react-query";
import type { ClientInput, ClientOutput } from "@spoke/protocol";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientContext } from "@/lib/client/provider";
import type { ClientError } from "@/lib/client/errors";
import { fill } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { useSessionStore } from "@/lib/stores/session";
import { Callout } from "../shared/callout";
import { contactTopics, supportCopy } from "./support-copy";

const email = z.email();

const noSubscription = () => () => undefined;

const useUserAgent = () =>
  useSyncExternalStore(
    noSubscription,
    () => navigator.userAgent,
    () => "",
  );
const maxMessage = 2000;

type Draft = { topic: string | null; email: string; message: string; details: boolean };

const emptyDraft: Draft = { topic: null, email: "", message: "", details: true };

const errorsOf = (draft: Draft) => {
  const length = draft.message.trim().length;
  return {
    topic: draft.topic ? null : supportCopy.errors.topic,
    email: email.safeParse(draft.email.trim()).success ? null : supportCopy.errors.email,
    message:
      length < 20 ? supportCopy.errors.short : length > maxMessage ? supportCopy.errors.long : null,
  };
};

export function ContactForm() {
  const page = usePathname();
  const { live, mode } = useClientContext();
  const wallet = useSessionStore((state) => (state.status === "signedIn" ? state.address : null));
  const userAgent = useUserAgent();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [tried, setTried] = useState(false);
  const send = useMutation<
    ClientOutput<"support.contact">,
    ClientError,
    ClientInput<"support.contact">
  >({ mutationFn: (input) => live.call("support.contact", input) });
  const diagnostics = [
    ...(wallet && mode === "live" ? [`${supportCopy.diagnostics.wallet}: ${wallet}`] : []),
    `${supportCopy.diagnostics.mode}: ${mode}`,
    `${supportCopy.diagnostics.route}: ${page}`,
    `${supportCopy.diagnostics.browser}: ${userAgent}`,
  ];
  const errors = errorsOf(draft);
  const shown = tried ? errors : { topic: null, email: null, message: null };
  const submit = () => {
    setTried(true);
    if (errors.topic || errors.email || errors.message || !draft.topic) return;
    const body = draft.message.trim();
    send.mutate({
      subject: draft.topic,
      email: draft.email.trim(),
      message: draft.details
        ? `${body}\n\n${supportCopy.diagnostics.heading}\n${diagnostics.join("\n")}`
        : body,
    });
  };
  if (send.data)
    return (
      <section id="contact" className="scroll-mt-28">
        <Card padding="lg" className="flex flex-col gap-4">
          <h2 className="font-display text-h4 text-ink font-medium">{supportCopy.form.heading}</h2>
          <Callout tone="success">
            <p>{fill(supportCopy.form.sent, { id: send.data.ticketId })}</p>
            {mode === "demo" ? <p className="mt-1">{supportCopy.form.demo}</p> : null}
          </Callout>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => {
              setDraft(emptyDraft);
              setTried(false);
              send.reset();
            }}
          >
            {supportCopy.form.another}
          </Button>
        </Card>
      </section>
    );
  return (
    <section id="contact" className="scroll-mt-28">
      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="font-display text-h4 text-ink font-medium">{supportCopy.form.heading}</h2>
        {send.error ? (
          <Callout tone="danger">
            {send.error.code === "RATE_LIMITED"
              ? supportCopy.errors.rateLimited
              : supportCopy.errors.failed}
          </Callout>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={supportCopy.form.topic} error={shown.topic}>
            <Select
              value={draft.topic ?? undefined}
              placeholder={supportCopy.form.topicPlaceholder}
              onValueChange={(topic) => {
                setDraft({ ...draft, topic });
              }}
              options={contactTopics.map((topic) => ({ value: topic, label: topic }))}
            />
          </Field>
          <Field
            label={supportCopy.form.email}
            helper={supportCopy.form.emailHelper}
            error={shown.email}
          >
            <Input
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={(event) => {
                setDraft({ ...draft, email: event.target.value });
              }}
            />
          </Field>
        </div>
        <Field
          label={supportCopy.form.message}
          helper={
            <span className="font-mono tabular-nums">
              {fill(supportCopy.form.counter, { count: formatCount(draft.message.length) })}
            </span>
          }
          error={shown.message}
        >
          <Textarea
            rows={6}
            maxLength={maxMessage}
            value={draft.message}
            onChange={(event) => {
              setDraft({ ...draft, message: event.target.value });
            }}
          />
        </Field>
        <Checkbox
          checked={draft.details}
          onCheckedChange={(details) => {
            setDraft({ ...draft, details });
          }}
          label={supportCopy.form.details}
        />
        {draft.details ? (
          <details className="pl-8">
            <summary className="text-subtle hover:text-ink w-fit cursor-pointer text-sm">
              {supportCopy.form.detailsShow}
            </summary>
            <ul className="bg-soft text-body mt-2 flex flex-col gap-1 rounded-xl px-3 py-2.5 font-mono text-sm break-all">
              {diagnostics.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-subtle text-sm">{supportCopy.form.line}</p>
          <Button loading={send.isPending} loadingLabel={supportCopy.form.sending} onClick={submit}>
            {supportCopy.form.send}
          </Button>
        </div>
      </Card>
    </section>
  );
}
