"use client";

import { Select } from "@/components/ui/select";
import { formText } from "@/lib/forms";
import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { parseUnits, formatUnits } from "viem";
import { ProductPage, QueryState } from "@/components/product/page";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useClientMutation, useClientQuery } from "@/lib/query/use-client";
import { publicEnv } from "@/lib/public-env";
import { useModeStore } from "@/lib/stores/mode";

type Fulfillment = "manual" | "external" | "download";

const categoryOptions = [
  { value: "digital", label: "Digital" },
  { value: "education", label: "Education" },
  { value: "software", label: "Software" },
  { value: "design", label: "Design" },
  { value: "other", label: "Other" },
] as const;

const fulfillmentOptions: readonly { value: Fulfillment; label: string }[] = [
  { value: "manual", label: "Manual instructions" },
  { value: "external", label: "External product URL" },
  { value: "download", label: "Private download" },
];

export function ProductEditor({ productId }: { productId?: string }) {
  const existing = useClientQuery(
    "products.get",
    { id: productId ?? "new" },
    { enabled: Boolean(productId) },
  );
  const tokens = useClientQuery("tokens.list", {});
  const save = useClientMutation("products.save", ["products"]);
  const upload = useClientMutation("products.uploadAsset", ["products"]);
  const mode = useModeStore((state) => state.mode);
  const [id] = useState(() => productId ?? crypto.randomUUID());
  const [deliverable, setDeliverable] = useState("");
  const [pickedCategory, setCategory] = useState<string | null>(null);
  const [pickedFulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const category = pickedCategory ?? existing.data?.category ?? "digital";
  const fulfillment = pickedFulfillment ?? existing.data?.fulfillmentMode ?? "manual";
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const token = tokens.data?.[0]?.address ?? publicEnv.NEXT_PUBLIC_DEMO_TOKEN_ADDRESS;
    if (!token) {
      setError("The payment token is not deployed.");
      return;
    }
    try {
      if (productId && !existing.data?.deliverable && !formText(form, "delivery"))
        throw new Error(
          "Your delivery configuration is unavailable. Refresh with the business owner account before saving.",
        );
      const category = formText(form, "category");
      if (
        category !== "digital" &&
        category !== "education" &&
        category !== "software" &&
        category !== "design" &&
        category !== "other"
      )
        throw new Error("Choose a product category.");
      const fulfillment = deliverable ? "download" : formText(form, "fulfillment");
      if (fulfillment !== "download" && fulfillment !== "external" && fulfillment !== "manual")
        throw new Error("Choose a delivery method.");
      const saved = await save.mutateAsync({
        id,
        product: {
          title: formText(form, "title"),
          summary: formText(form, "summary"),
          description: formText(form, "description"),
          priceBaseUnits: parseUnits(formText(form, "price"), 6).toString(),
          token,
          category,
          fulfillmentMode: fulfillment,
          deliverable: deliverable || formText(form, "delivery"),
          refundPolicy: formText(form, "refund"),
          outcome: formText(form, "outcome"),
        },
      });
      router.push(`/sell/products/${saved.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The product could not be saved.");
    }
  };
  return (
    <ProductPage
      title={productId ? "Edit product" : "Add a product"}
      description="Describe exactly what a buyer receives. Changes create a new version when the price or deliverable changes."
    >
      <QueryState
        pending={Boolean(productId) && existing.isPending}
        error={existing.error}
        retry={() => void existing.refetch()}
      >
        <Card className="max-w-3xl">
          <form
            key={existing.data?.version ?? "new"}
            onSubmit={(event) => void submit(event)}
            className="space-y-4"
          >
            <Field label="Title">
              <Input
                name="title"
                required
                minLength={2}
                maxLength={150}
                defaultValue={existing.data?.title}
              />
            </Field>
            <Field label="Summary">
              <Input name="summary" maxLength={300} defaultValue={existing.data?.summary} />
            </Field>
            <Field label="What the buyer gets">
              <Input name="outcome" maxLength={500} defaultValue={existing.data?.outcome} />
            </Field>
            <Field label="Description">
              <Textarea
                name="description"
                rows={5}
                maxLength={15000}
                defaultValue={existing.data?.description}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price in SDUSD">
                <Input
                  name="price"
                  required
                  inputMode="decimal"
                  pattern="[0-9]+(\.[0-9]{1,6})?"
                  defaultValue={
                    existing.data ? formatUnits(BigInt(existing.data.priceBaseUnits), 6) : "10"
                  }
                />
              </Field>
              <Field label="Category">
                <Select
                  name="category"
                  value={category}
                  onValueChange={setCategory}
                  options={
                    categoryOptions.some((option) => option.value === category)
                      ? categoryOptions
                      : [...categoryOptions, { value: category, label: category }]
                  }
                />
              </Field>
            </div>
            <Field label="Delivery method">
              <Select
                name="fulfillment"
                value={fulfillment}
                onValueChange={setFulfillment}
                options={fulfillmentOptions}
              />
            </Field>
            <Field
              label="Delivery instructions, URL or asset ID"
              helper="For downloads, upload a file below and save this product again. For external delivery, provide the destination URL."
            >
              <Textarea
                name="delivery"
                required
                minLength={1}
                maxLength={2048}
                defaultValue={existing.data?.deliverable ?? ""}
              />
            </Field>
            {productId ? (
              <Field
                label="Upload deliverable"
                helper="Uploads are private to your business until attached to a product version."
              >
                <Input
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file)
                      void upload
                        .mutateAsync({ id, file })
                        .then((asset) => {
                          setDeliverable(asset.id);
                        })
                        .catch(() => undefined);
                  }}
                />
                {upload.data ? (
                  <p className="text-sm">
                    Uploaded {upload.data.size} bytes · SHA-256 {upload.data.sha256}
                  </p>
                ) : null}
                {upload.error ? (
                  <p className="text-pink-ink text-sm">{upload.error.message}</p>
                ) : null}
              </Field>
            ) : null}
            <Field label="Refund policy">
              <Textarea
                name="refund"
                required
                minLength={10}
                maxLength={3000}
                defaultValue={
                  existing.data?.refundPolicy ??
                  "Contact the merchant before the settlement hold ends for a full refund."
                }
              />
            </Field>
            {error ? (
              <p role="alert" className="text-pink-ink">
                {error}
              </p>
            ) : null}
            {mode === "demo" ? (
              <p className="text-subtle text-sm">Sample product · changes stay in Demo.</p>
            ) : null}
            <Button type="submit" loading={save.isPending}>
              Save product
            </Button>
          </form>
        </Card>
      </QueryState>
    </ProductPage>
  );
}
