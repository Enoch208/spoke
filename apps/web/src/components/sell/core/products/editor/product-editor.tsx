"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductPage, PageSkeleton } from "@/components/product/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { editorCopy as copy } from "../../copy/editor";
import { Callout } from "../../shared/callout";
import { useIsDemo } from "../../shared/hooks";
import { ProductStatusChip, useProductUsage } from "../product-chip";
import { isReady } from "../product-status";
import { BasicsSection } from "./basics-section";
import { DeliverySection, MediaSection, PriceSection } from "./delivery-sections";
import { FingerprintCard, ProductPreview, UsedByCard } from "./editor-rail";
import { readinessHints } from "./product-form";
import { TermsSection } from "./terms-section";
import { useProductEditor } from "./use-product-editor";

export function ProductEditor({ productId }: { productId?: string }) {
  const editor = useProductEditor(productId);
  const demo = useIsDemo();
  const me = useClientQuery("merchants.me", {});
  const usage = useProductUsage(me.data?.slug);
  const [previewing, setPreviewing] = useState(false);
  const { form, set, errors, existing } = editor;
  const product = existing.data;
  const crumbs = [{ label: copy.breadcrumb, href: "/sell/products" }];
  if (productId && existing.isPending) return <PageSkeleton />;
  if (productId && !product)
    return (
      <ProductPage title={copy.breadcrumb} breadcrumbs={crumbs}>
        <Card>
          <EmptyState
            title={existing.error?.code === "NOT_AUTHORIZED" ? copy.notYours : copy.notFound}
            actions={
              <Button asChild variant="secondary">
                <Link href="/sell/products">{copy.back}</Link>
              </Button>
            }
          />
        </Card>
      </ProductPage>
    );
  const used = product ? usage.get(product.id) : undefined;
  const inUse = (used?.live ?? 0) + (used?.paused ?? 0);
  const saveButton = (
    <Button loading={editor.save.isPending} loadingLabel={copy.saving} onClick={editor.submit}>
      {copy.save}
    </Button>
  );
  return (
    <ProductPage
      title={product?.title ?? copy.newTitle}
      breadcrumbs={crumbs}
      actions={
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {editor.returnTo ? (
            <Button asChild variant="ghost">
              <Link href={editor.returnTo}>{copy.backToCampaign}</Link>
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              setPreviewing(true);
            }}
          >
            {copy.preview}
          </Button>
          {saveButton}
        </div>
      }
    >
      {product ? (
        <div className="flex flex-wrap items-center gap-2">
          <ProductStatusChip product={product} size="md" />
          <Badge>{fill(copy.version, { v: String(product.version) })}</Badge>
          {isReady(product) ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/sell/campaigns/new?product=${encodeURIComponent(product.id)}`}>
                {copy.createCampaign}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      {product && inUse > 0 ? (
        <Callout tone="info">
          {inUse === 1
            ? fill(copy.versionNoticeOne, {
                v: String(product.version),
                next: String(product.version + 1),
              })
            : fill(copy.versionNotice, {
                n: String(inUse),
                v: String(product.version),
                next: String(product.version + 1),
              })}
        </Callout>
      ) : null}
      {editor.save.error ? (
        <Callout tone="danger">
          {copy.saveFailed} {editor.save.error.message}
        </Callout>
      ) : null}
      <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-0">
        <div className="min-w-0 space-y-6">
          <BasicsSection form={form} set={set} errors={errors} hints={readinessHints(form)} />
          <MediaSection product={product} onUploaded={editor.onUploaded} />
          <PriceSection form={form} set={set} errors={errors} token={editor.token} />
          <DeliverySection
            form={form}
            set={set}
            errors={errors}
            product={product}
            onUploaded={editor.onUploaded}
          />
          <TermsSection form={form} set={set} errors={errors} demo={demo} product={product} />
        </div>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ProductPreview form={form} product={product} token={editor.token} />
          {product ? <FingerprintCard product={product} /> : null}
          {product ? <UsedByCard productId={product.id} slug={me.data?.slug} /> : null}
        </aside>
      </div>
      <div className="bg-page/95 border-hairline fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t px-4 py-3 backdrop-blur sm:hidden">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setPreviewing(true);
          }}
        >
          {copy.preview}
        </Button>
        <Button
          className="flex-1"
          loading={editor.save.isPending}
          loadingLabel={copy.saving}
          onClick={editor.submit}
        >
          {copy.save}
        </Button>
      </div>
      <Drawer open={previewing} onOpenChange={setPreviewing} title={copy.preview}>
        <ProductPreview form={form} product={product} token={editor.token} />
      </Drawer>
    </ProductPage>
  );
}
