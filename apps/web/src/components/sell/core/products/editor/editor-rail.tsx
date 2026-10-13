"use client";

import Link from "next/link";
import { CampaignArt } from "@/components/product/campaign-art";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-field";
import { ModeBadge } from "@/components/ui/mode-badge";
import { useClientQuery } from "@/lib/query/use-client";
import { formatAmount, shortHash, type TokenLike } from "@/lib/format";
import { routeTo } from "@/lib/routes";
import { common, fill } from "@/lib/copy";
import { editorCopy as copy } from "../../copy/editor";
import { useIsDemo } from "../../shared/hooks";
import type { Product } from "../product-status";
import { parsePrice, type ProductForm } from "./product-form";

export function ProductPreview({
  form,
  product,
  token,
}: {
  form: ProductForm;
  product: Product | undefined;
  token: TokenLike | null;
}) {
  const demo = useIsDemo();
  const price = token ? parsePrice(form.price, token.decimals) : null;
  return (
    <Card padding="none" className="overflow-hidden">
      <CampaignArt
        seed={product?.id ?? "new-product"}
        imageUrl={product?.media.find((asset) => asset.kind === "image")?.url}
        title={form.title}
        className="h-40"
      />
      <div className="space-y-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-subtle text-sm">{copy.preview}</p>
          {demo ? <ModeBadge mode="demo" /> : null}
        </div>
        <h3 className="font-display text-h4 text-ink font-medium">{form.title || copy.newTitle}</h3>
        {form.outcome ? <p className="text-body text-sm">{form.outcome}</p> : null}
        {token && typeof price === "bigint" ? (
          <p className="text-ink font-mono tabular-nums">
            {formatAmount(price, token, { testnet: true })}
          </p>
        ) : null}
        {form.description ? (
          <p className="text-subtle line-clamp-4 text-sm whitespace-pre-line">{form.description}</p>
        ) : null}
      </div>
    </Card>
  );
}

export function FingerprintCard({ product }: { product: Product }) {
  const demo = useIsDemo();
  return (
    <Card padding="lg" className="space-y-2">
      <h2 className="text-ink font-medium">{copy.fingerprint}</h2>
      <p className="flex items-center gap-1 text-sm">
        <span className="text-subtle">{copy.fingerprintLabel}</span>
        <span className="text-ink font-mono tabular-nums" title={product.skuHash}>
          {shortHash(product.skuHash)}
        </span>
        <CopyButton
          value={product.skuHash}
          label={copy.fingerprintLabel}
          copiedMessage={copy.fingerprintLabel}
        />
      </p>
      <p className="text-subtle text-xs leading-relaxed">{copy.fingerprintNote}</p>
      {demo ? <p className="text-subtle text-xs">{common.simulated}</p> : null}
    </Card>
  );
}

export function UsedByCard({ productId, slug }: { productId: string; slug: string | undefined }) {
  const active = useClientQuery(
    "campaigns.list",
    { merchant: slug ?? "", status: "active", limit: 100 },
    { enabled: Boolean(slug) },
  );
  const paused = useClientQuery(
    "campaigns.list",
    { merchant: slug ?? "", status: "paused", limit: 100 },
    { enabled: Boolean(slug) },
  );
  const list = [...(active.data?.items ?? []), ...(paused.data?.items ?? [])].filter(
    (card) => card.product.id === productId,
  );
  return (
    <Card padding="lg" className="space-y-2">
      <h2 className="text-ink font-medium">{copy.usedBy}</h2>
      {list.length === 0 ? (
        <p className="text-subtle text-sm">{copy.usedByEmpty}</p>
      ) : (
        <ul className="space-y-1">
          {list.map((card) => (
            <li key={card.campaignId} className="flex items-center justify-between gap-2">
              <Link
                href={routeTo.sellCampaign(card.campaignId)}
                className="text-ink text-sm underline-offset-2 hover:underline"
              >
                {fill(copy.usedByItem, { id: card.campaignId })}
              </Link>
              <CampaignStateChip campaign={card} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
