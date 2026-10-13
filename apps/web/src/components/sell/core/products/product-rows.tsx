"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CampaignArt } from "@/components/product/campaign-art";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { useUiStore } from "@/lib/stores/ui";
import { fill, toasts } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientMutation } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { productsCopy as copy } from "../copy/products";
import { ActionMenu, type MenuItem } from "../shared/action-menu";
import { ProductStatusChip, type ProductUsage } from "./product-chip";
import { inputCategory, isReady, type Product } from "./product-status";

const usageText = (usage: ProductUsage | undefined) => {
  const parts = [
    ...(usage?.live ? [fill(copy.usedLive, { n: String(usage.live) })] : []),
    ...(usage?.paused ? [fill(copy.usedPaused, { n: String(usage.paused) })] : []),
  ];
  return parts.length ? parts.join(" · ") : copy.unused;
};

function useMenu() {
  const router = useRouter();
  const save = useClientMutation("products.save", ["products"]);
  return (product: Product, usage: ProductUsage | undefined): MenuItem[] => [
    { key: "edit", label: copy.edit, href: routeTo.product(product.id) },
    ...(isReady(product)
      ? [
          {
            key: "campaign",
            label: copy.createCampaign,
            href: `/sell/campaigns/new?product=${encodeURIComponent(product.id)}`,
          },
        ]
      : []),
    ...(product.deliverable
      ? [
          {
            key: "duplicate",
            label: copy.duplicate,
            onSelect: () => {
              save.mutate(
                {
                  id: crypto.randomUUID(),
                  product: {
                    title: `${product.title}${copy.copySuffix}`,
                    summary: product.summary,
                    outcome: product.outcome,
                    description: product.description,
                    category: inputCategory(product.category),
                    priceBaseUnits: product.priceBaseUnits,
                    token: product.token.address,
                    fulfillmentMode: product.fulfillmentMode,
                    deliverable: product.deliverable ?? "",
                    refundPolicy: product.refundPolicy,
                  },
                },
                {
                  onSuccess: (saved) => {
                    useUiStore.getState().pushToast({
                      id: "T-02",
                      tone: "success",
                      message: copy.duplicated,
                      durationMs: toasts["T-02"].duration,
                    });
                    router.push(routeTo.product(saved.id));
                  },
                },
              );
            },
          },
        ]
      : []),
    ...(usage?.liveCampaignId
      ? [{ key: "view", label: copy.viewCampaign, href: routeTo.campaign(usage.liveCampaignId) }]
      : []),
  ];
}

export function ProductRows({
  products,
  usage,
  categoryName,
}: {
  products: readonly Product[];
  usage: ReadonlyMap<string, ProductUsage>;
  categoryName: (id: string) => string;
}) {
  const menu = useMenu();
  return (
    <>
      <Table caption={copy.title} className="hidden md:block">
        <THead>
          <tr>
            <Th>{copy.columns.product}</Th>
            <Th numeric>{copy.columns.price}</Th>
            <Th>{copy.columns.category}</Th>
            <Th>{copy.columns.status}</Th>
            <Th>{copy.columns.version}</Th>
            <Th>{copy.columns.campaigns}</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </THead>
        <TBody>
          {products.map((product, index) => (
            <Tr key={product.id}>
              <Td className="py-3">
                <Link href={routeTo.product(product.id)} className="group flex items-center gap-3">
                  <CampaignArt
                    seed={product.id}
                    imageUrl={product.media.find((asset) => asset.kind === "image")?.url}
                    title={product.title}
                    className="size-12 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0">
                    <span className="text-ink block max-w-72 truncate font-medium group-hover:underline">
                      {product.title}
                    </span>
                    <span className="text-subtle block max-w-72 truncate text-xs">
                      {product.outcome || product.summary}
                    </span>
                  </span>
                </Link>
              </Td>
              <Td numeric className="whitespace-nowrap">
                {formatAmount(BigInt(product.priceBaseUnits), product.token, {
                  testnet: index === 0,
                })}
              </Td>
              <Td className="text-body text-sm">{categoryName(product.category)}</Td>
              <Td>
                <ProductStatusChip product={product} />
              </Td>
              <Td className="text-subtle font-mono text-sm">
                {fill(copy.version, { v: String(product.version) })}
              </Td>
              <Td className="text-subtle text-sm whitespace-nowrap">
                {usageText(usage.get(product.id))}
              </Td>
              <Td>
                <ActionMenu
                  label={fill(copy.menu, { title: product.title })}
                  items={menu(product, usage.get(product.id))}
                />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <ul className="divide-hairline divide-y md:hidden">
        {products.map((product) => (
          <li key={product.id} className="relative flex gap-3 px-5 py-4">
            <CampaignArt
              seed={product.id}
              imageUrl={product.media.find((asset) => asset.kind === "image")?.url}
              title={product.title}
              className="size-14 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Link
                href={routeTo.product(product.id)}
                className="text-ink block font-medium after:absolute after:inset-0"
              >
                {product.title}
              </Link>
              <p className="text-ink font-mono text-sm tabular-nums">
                {formatAmount(BigInt(product.priceBaseUnits), product.token)}
              </p>
              <ProductStatusChip product={product} />
              <p className="text-subtle text-xs">{usageText(usage.get(product.id))}</p>
            </div>
            <div className="relative z-10">
              <ActionMenu
                label={fill(copy.menu, { title: product.title })}
                items={menu(product, usage.get(product.id))}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
