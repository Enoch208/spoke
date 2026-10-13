"use client";

import { File01Icon, Image01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/copy";
import { shortHash, type TokenLike } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui";
import { editorCopy as copy } from "../../copy/editor";
import { formatMegabytes } from "../../modals/upload-rules";
import type { Product } from "../product-status";
import { Section } from "./basics-section";
import type { Fulfillment, FormErrors, ProductForm } from "./product-form";

type Setter = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;

export function MediaSection({
  product,
  onUploaded,
}: {
  product: Product | undefined;
  onUploaded: () => void;
}) {
  const images = (product?.media ?? []).filter((asset) => asset.kind === "image");
  return (
    <Section title={copy.sections.media}>
      {product ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((asset, index) =>
            asset.url ? (
              <img
                key={asset.id}
                src={asset.url}
                alt={fill(copy.media.image, { n: String(index + 1) })}
                className="bg-soft aspect-square w-full rounded-xl object-cover"
              />
            ) : null,
          )}
          <button
            type="button"
            onClick={() => {
              useUiStore
                .getState()
                .open("M-30", { kind: "productImage", productId: product.id, onUploaded });
            }}
            className="border-line hover:border-ink text-subtle hover:text-ink ease-spring flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm transition-colors duration-[423ms]"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={20} strokeWidth={1.8} aria-hidden="true" />
            {copy.media.add}
          </button>
        </div>
      ) : (
        <div className="border-line text-subtle flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-sm">
          <HugeiconsIcon icon={Image01Icon} size={20} strokeWidth={1.8} aria-hidden="true" />
          {copy.media.saveFirst}
        </div>
      )}
    </Section>
  );
}

export function PriceSection({
  form,
  set,
  errors,
  token,
}: {
  form: ProductForm;
  set: Setter;
  errors: FormErrors;
  token: TokenLike | null;
}) {
  return (
    <Section title={copy.sections.price}>
      <Field label={copy.fields.price} helper={copy.fields.priceHelper} error={errors.price}>
        <Input
          value={form.price}
          inputMode="decimal"
          mono
          placeholder="0.00"
          suffix={token?.symbol ?? "SDUSD"}
          onChange={(event) => {
            set("price", event.target.value);
          }}
        />
      </Field>
      <p className="text-subtle text-sm">{copy.fields.priceNote}</p>
    </Section>
  );
}

export function DeliverySection({
  form,
  set,
  errors,
  product,
  onUploaded,
}: {
  form: ProductForm;
  set: Setter;
  errors: FormErrors;
  product: Product | undefined;
  onUploaded: () => void;
}) {
  const file = product?.media.find((asset) => asset.id === form.file);
  return (
    <Section title={copy.sections.delivery}>
      <RadioGroup<Fulfillment>
        label={copy.delivery.label}
        value={form.fulfillment}
        onValueChange={(value) => {
          set("fulfillment", value);
        }}
        options={[
          {
            value: "download",
            label: copy.delivery.download,
            description: product ? copy.delivery.downloadNote : copy.delivery.downloadLocked,
            disabled: !product,
          },
          {
            value: "external",
            label: copy.delivery.external,
            description: copy.delivery.externalNote,
          },
          { value: "manual", label: copy.delivery.manual, description: copy.delivery.manualNote },
        ]}
      />
      {form.fulfillment === "download" && product ? (
        <div className="space-y-2">
          <div className="border-hairline flex items-center gap-3 rounded-xl border p-3">
            <span className="bg-pill flex size-10 shrink-0 items-center justify-center rounded-lg">
              <HugeiconsIcon icon={File01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-ink font-medium">{copy.delivery.file}</p>
              <p className="text-subtle truncate text-xs">
                {file
                  ? `${formatMegabytes(file.size)} · SHA-256 ${shortHash(`0x${file.sha256}`)}`
                  : form.file || copy.delivery.noFile}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                useUiStore.getState().open("M-30", {
                  kind: "deliverable",
                  productId: product.id,
                  onUploaded: (assetId) => {
                    set("file", assetId);
                    onUploaded();
                  },
                });
              }}
            >
              {copy.delivery.addFile}
            </Button>
          </div>
          {errors.file ? <p className="text-pink-ink text-sm">{errors.file}</p> : null}
        </div>
      ) : null}
      {form.fulfillment === "external" ? (
        <Field label={copy.fields.link} helper={copy.fields.linkHelper} error={errors.link}>
          <Input
            value={form.link}
            inputMode="url"
            placeholder="https://"
            onChange={(event) => {
              set("link", event.target.value);
            }}
          />
        </Field>
      ) : null}
      {form.fulfillment === "manual" ? (
        <Field
          label={copy.fields.instructions}
          helper={copy.fields.instructionsHelper}
          error={errors.instructions}
        >
          <Textarea
            value={form.instructions}
            rows={4}
            maxLength={2000}
            onChange={(event) => {
              set("instructions", event.target.value);
            }}
          />
        </Field>
      ) : null}
      <p className="text-subtle text-sm">{copy.delivery.refundNote}</p>
    </Section>
  );
}
