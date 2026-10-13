"use client";

import type { ReactNode } from "react";
import { productInput } from "@spoke/protocol";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClientQuery } from "@/lib/query/use-client";
import { editorCopy as copy } from "../../copy/editor";
import type { FormErrors, ProductForm } from "./product-form";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding="lg" className="space-y-4">
      <h2 className="font-display text-h4 text-ink font-medium">{title}</h2>
      {children}
    </Card>
  );
}

const fallbackNames = {
  digital: "Digital goods",
  education: "Education",
  software: "Software",
  design: "Design",
  other: "Other",
} as const;

export function BasicsSection({
  form,
  set,
  errors,
  hints,
}: {
  form: ProductForm;
  set: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
  errors: FormErrors;
  hints: FormErrors;
}) {
  const categories = useClientQuery("products.categories", {});
  const options = productInput.shape.category.options.map((value) => ({
    value,
    label: categories.data?.find((item) => item.id === value)?.name ?? fallbackNames[value],
  }));
  return (
    <Section title={copy.sections.basics}>
      <Field label={copy.fields.title} error={errors.title}>
        <Input
          value={form.title}
          maxLength={80}
          onChange={(event) => {
            set("title", event.target.value);
          }}
        />
      </Field>
      <Field
        label={copy.fields.outcome}
        helper={hints.outcome ?? copy.fields.outcomeHelper}
        error={errors.outcome}
      >
        <Input
          value={form.outcome}
          maxLength={140}
          onChange={(event) => {
            set("outcome", event.target.value);
          }}
        />
      </Field>
      <Field label={copy.fields.summary} optional error={errors.summary}>
        <Input
          value={form.summary}
          maxLength={300}
          onChange={(event) => {
            set("summary", event.target.value);
          }}
        />
      </Field>
      <Field
        label={copy.fields.description}
        helper={hints.description ?? copy.fields.descriptionHelper}
      >
        <Textarea
          value={form.description}
          rows={6}
          maxLength={5000}
          onChange={(event) => {
            set("description", event.target.value);
          }}
        />
      </Field>
      <Field label={copy.fields.category} error={errors.category}>
        <Select
          value={form.category || undefined}
          placeholder={copy.fields.categoryPlaceholder}
          onValueChange={(value) => {
            set("category", value);
          }}
          options={options}
        />
      </Field>
    </Section>
  );
}
