"use client";

import { InformationCircleIcon, PackageIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { CampaignArt } from "@/components/product/campaign-art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/empty-state";
import { fill } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { composerCopy } from "./copy";
import type { ComposerToken, ProductLite } from "./derive";

const copy = composerCopy.product;
const newProductHref = `${routes.sell.newProduct}?returnTo=${encodeURIComponent(routes.sell.newCampaign)}`;

export type OtherDraft = { readonly draftId: string };

function ProductOption({
  product,
  selected,
  live,
  token,
  onSelect,
}: {
  product: ProductLite;
  selected: boolean;
  live: boolean;
  token: ComposerToken;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx(
        "group bg-surface ease-spring flex w-full min-w-0 items-center gap-4 rounded-2xl border p-3 text-left transition-colors duration-[423ms]",
        selected ? "border-ink" : "border-hairline hover:border-pill-edge",
      )}
    >
      <CampaignArt
        seed={product.id}
        imageUrl={product.imageUrl}
        title={product.title}
        className="size-16 shrink-0 rounded-xl"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ink truncate font-medium">{product.title}</span>
        <span className="text-ink font-mono text-sm tabular-nums">
          {formatAmount(product.priceMinor, token)}
        </span>
        <span className="text-subtle text-sm">
          {product.categoryLabel} · {fill(copy.version, { version: String(product.version) })}
        </span>
        {live ? <span className="text-amber-ink text-sm">{copy.liveNote}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "flex size-6 shrink-0 items-center justify-center rounded-full border",
          selected ? "bg-ink border-ink text-page" : "border-control-edge",
        )}
      >
        {selected ? <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.4} /> : null}
      </span>
    </button>
  );
}

export function ProductStep({
  products,
  selectedId,
  liveIds,
  otherDraft,
  error,
  token,
  onSelect,
}: {
  products: readonly ProductLite[];
  selectedId: string | null;
  liveIds: ReadonlySet<string>;
  otherDraft: OtherDraft | null;
  error: string | undefined;
  token: ComposerToken;
  onSelect: (productId: string) => void;
}) {
  const actions = (
    <>
      <Button asChild variant="secondary">
        <Link href={newProductHref}>{copy.add}</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href={routes.sell.products}>{copy.manage}</Link>
      </Button>
    </>
  );
  if (products.length === 0)
    return (
      <Card>
        <EmptyState
          icon={PackageIcon}
          title={copy.emptyTitle}
          body={copy.emptyBody}
          actions={actions}
        />
      </Card>
    );
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-h4 text-ink font-medium tracking-[-0.01em]">
          {copy.title}
        </h2>
        <p className="text-subtle mt-1 text-sm">{copy.description}</p>
      </div>
      <div role="radiogroup" aria-label={copy.title} className="grid gap-3 xl:grid-cols-2">
        {products.map((product) => (
          <ProductOption
            key={product.id}
            product={product}
            token={token}
            selected={product.id === selectedId}
            live={liveIds.has(product.id)}
            onSelect={() => {
              onSelect(product.id);
            }}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-pink-ink text-sm">
          {error}
        </p>
      ) : null}
      {selectedId && liveIds.has(selectedId) ? (
        <p className="bg-sky-soft text-sky-ink flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={16}
            strokeWidth={1.8}
            className="mt-0.5 shrink-0"
          />
          {copy.liveInfo}
        </p>
      ) : null}
      {otherDraft ? (
        <div className="bg-sky-soft text-sky-ink flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm">
          <span>{copy.draftInfo}</span>
          <Button asChild variant="ghost" size="sm">
            <Link
              href={`${routes.sell.newCampaign}?draft=${encodeURIComponent(otherDraft.draftId)}`}
            >
              {copy.openDraft}
            </Link>
          </Button>
        </div>
      ) : null}
      <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm">
          <span className="text-subtle">{copy.token} </span>
          <span className="text-ink">{fill(copy.tokenValue, { symbol: token.symbol })}</span>
        </p>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </Card>
  );
}
