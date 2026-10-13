"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount } from "@/lib/format";
import { editorCopy as copy } from "../../copy/editor";
import type { Product } from "../product-status";
import { Section } from "./basics-section";
import type { FormErrors, ProductForm } from "./product-form";

type Setter = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;

export function TermsSection({
  form,
  set,
  errors,
  demo,
  product,
}: {
  form: ProductForm;
  set: Setter;
  errors: FormErrors;
  demo: boolean;
  product: Product | undefined;
}) {
  return (
    <>
      <Section title={copy.sections.refund}>
        <Field label={copy.fields.refund} helper={copy.fields.refundHelper} error={errors.refund}>
          <Textarea
            value={form.refund}
            rows={3}
            maxLength={3000}
            onChange={(event) => {
              set("refund", event.target.value);
            }}
          />
        </Field>
      </Section>
      <Section title={copy.sections.variants}>
        {demo && product && product.variants.length > 0 ? (
          <ul className="divide-hairline divide-y text-sm">
            <li className="text-subtle py-2">{copy.variants.readOnly}</li>
            {product.variants.map((variant) => (
              <li key={variant.id} className="flex justify-between gap-3 py-2">
                <span className="text-ink">{variant.name}</span>
                <span className="font-mono tabular-nums">
                  {formatAmount(BigInt(variant.priceBaseUnits), product.token)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-subtle">{demo ? copy.variants.none : copy.variants.demoOnly}</p>
            {demo ? null : (
              <Button asChild size="sm" variant="secondary">
                <Link href="/demo">{copy.variants.tryDemo}</Link>
              </Button>
            )}
          </div>
        )}
      </Section>
      <Section title={copy.sections.rights}>
        <Checkbox
          checked={form.rights}
          onCheckedChange={(checked) => {
            set("rights", checked);
          }}
          label={copy.rights}
        />
        {errors.rights ? <p className="text-pink-ink text-sm">{errors.rights}</p> : null}
      </Section>
    </>
  );
}
