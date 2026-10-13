"use client";

import { Share08Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Piece } from "@/components/art/piece";
import { useFeatureGate } from "@/components/app/feature-gate";
import { PanelBackdrop } from "@/components/landing/panel-backdrop";
import { CampaignStateChip } from "@/components/product/campaign-state-chip";
import { ProductPage, QueryState } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { Qr } from "@/components/ui/qr";
import { useCopy } from "@/components/ui/use-copy";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { useUiStore } from "@/lib/stores/ui";
import { routeTo, routes } from "@/lib/routes";
import { composerCopy } from "./copy";
import { launchedCopy } from "./copy-launch";
import { LaunchedProof } from "./launched-proof";

const copy = launchedCopy;

const origin = () => (typeof window === "undefined" ? "" : window.location.origin);

export function LaunchedPanel({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const gate = useFeatureGate();
  const copyText = useCopy();
  const query = useClientQuery("campaigns.get", { campaignId }, { refetchInterval: 5000 });
  const campaign = query.data;
  const url = `${origin()}${routeTo.campaign(campaignId)}`;
  const name = campaign?.product.title ?? "";
  const open = useUiStore((state) => state.open);
  const share = () => {
    const text = fill(copy.shareText, { name });
    if (typeof navigator.share === "function") {
      void navigator.share({ title: text, url }).catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          void copyText(url, copy.copied);
      });
      return;
    }
    void copyText(url, copy.copied);
  };
  return (
    <ProductPage
      title={copy.title}
      breadcrumbs={[{ label: composerCopy.crumbs.campaigns, href: routes.sell.campaigns }]}
    >
      <QueryState pending={query.isPending} error={query.error} retry={() => void query.refetch()}>
        {campaign ? (
          <div className="flex flex-col gap-4">
            <section className="relative overflow-hidden rounded-3xl px-6 py-8 sm:px-8 sm:py-10">
              <PanelBackdrop tone="lime" />
              <Piece
                id="launched-lime"
                shape="lime"
                className="absolute top-1/2 right-10 hidden h-[78%] -translate-y-1/2 drop-shadow-[0_18px_24px_rgba(26,26,26,0.12)] sm:block"
              />
              <div className="relative flex max-w-[560px] flex-col gap-3">
                <span className="bg-surface/80 w-fit rounded-full">
                  <CampaignStateChip campaign={campaign} size="md" />
                </span>
                <h2 className="font-display text-h3 text-ink font-medium tracking-[-0.02em]">
                  {campaign.product.title}
                </h2>
                <p className="text-body">{copy.description}</p>
              </div>
            </section>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card padding="lg" className="flex min-w-0 flex-col gap-4">
                <h3 className="text-ink text-base font-medium">{copy.page}</h3>
                <CopyField value={url} label={copy.copyLink} copiedMessage={copy.copied} />
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    aria-label={copy.openQr}
                    onClick={() => {
                      open("M-14", { url, title: name });
                    }}
                    className="ease-spring rounded-xl transition-transform duration-[423ms] hover:scale-[1.02]"
                  >
                    <Qr
                      value={url}
                      label={fill(copy.qr, { name })}
                      size={152}
                      className="bg-surface border-hairline border p-2"
                    />
                  </button>
                  <div className="flex flex-col gap-2">
                    <p className="text-subtle text-sm">{copy.merchantNote}</p>
                    <Button variant="secondary" icon={Share08Icon} onClick={share}>
                      {copy.share}
                    </Button>
                  </div>
                </div>
                <div className="border-hairline flex flex-wrap gap-2 border-t pt-4">
                  <Button asChild>
                    <Link href={routeTo.sellCampaign(campaignId)}>{copy.open}</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={routes.sell.discover}>{copy.find}</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      gate("widgets", () => {
                        router.push(routes.developers.widgets);
                      });
                    }}
                  >
                    {copy.embed}
                  </Button>
                </div>
              </Card>
              <LaunchedProof campaign={campaign} />
            </div>
          </div>
        ) : null}
      </QueryState>
    </ProductPage>
  );
}
