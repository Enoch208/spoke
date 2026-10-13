"use client";

import { QrCodeIcon, Share08Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ModalComponentProps } from "@/components/app/modal-types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCopy } from "@/components/ui/use-copy";
import { useClientContext } from "@/lib/client/provider";
import { fill, required, toasts } from "@/lib/copy";
import { formatAmount } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { createLinkCopy, shareKitCopy } from "../copy/links";
import { DialogError, DialogSkeleton } from "../shared/dialog-states";
import { LinkField } from "../shared/link-field";
import { linkStatus } from "../shared/link-status";
import { ShareChannels } from "./share-channels";
import { EmbedCard } from "./share-embed";

const webShareDismissed = () => null;

const disclosed = (caption: string) => /commission|earn|#ad|sponsored/i.test(caption);

export default function ShareKit({ props, isTop, close }: ModalComponentProps<"M-13">) {
  const { mode } = useClientContext();
  const open = useUiStore((state) => state.open);
  const copy = useCopy();
  const copyButton = useRef<HTMLButtonElement>(null);
  const link = useClientQuery("links.get", { nodeId: props.nodeId });
  const stats = useClientQuery("links.stats", { nodeId: props.nodeId });
  const [edited, setEdited] = useState<string | null>(null);
  const row = link.data;
  const product = row?.campaign.product.title ?? "";
  const merchant = row?.campaign.merchant.name ?? "";
  const caption =
    edited ?? (row ? fill(shareKitCopy.caption, { product, merchant, url: row.url }) : "");
  const status = row ? linkStatus(row) : null;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const earned = stats.data
    ? BigInt(stats.data.earned.claimable) + BigInt(stats.data.earned.claimed)
    : null;
  return (
    <Sheet
      placement="share"
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      inert={!isTop}
      initialFocus={copyButton}
      title={shareKitCopy.title}
      subtitle={row ? `${product} · ${merchant}` : undefined}
      footer={
        <Button asChild variant="ghost">
          <Link href={routeTo.link(props.nodeId)} onClick={close}>
            {shareKitCopy.openLinkPage}
          </Link>
        </Button>
      }
    >
      {link.isPending ? <DialogSkeleton /> : null}
      {link.error ? <DialogError error={link.error} retry={() => void link.refetch()} /> : null}
      {row ? (
        <div className="grid gap-5">
          {status === "paused" ? (
            <p className="bg-amber-soft text-amber-ink rounded-xl px-4 py-3 text-sm">
              {required.paused}
            </p>
          ) : null}
          {status === "closed" ? (
            <p className="bg-soft text-body rounded-xl px-4 py-3 text-sm">{shareKitCopy.ended}</p>
          ) : null}
          {status === "exhausted" ? (
            <p className="bg-amber-soft text-amber-ink rounded-xl px-4 py-3 text-sm">
              {createLinkCopy.exhausted}
            </p>
          ) : null}
          <LinkField url={row.url} label={shareKitCopy.copyLink} buttonRef={copyButton} />
          {status !== "closed" ? (
            <div className="flex flex-wrap gap-2">
              {canShare && mode === "live" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Share08Icon}
                  onClick={() => {
                    navigator
                      .share({ title: product, text: caption, url: row.url })
                      .catch(webShareDismissed);
                  }}
                >
                  {shareKitCopy.share}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                icon={QrCodeIcon}
                onClick={() => open("M-14", { url: row.url, title: product })}
              >
                {shareKitCopy.qr}
              </Button>
            </div>
          ) : null}
          {status !== "closed" ? (
            <section className="grid gap-2">
              <h3 className="text-ink text-sm font-medium">{shareKitCopy.shareTo}</h3>
              {mode === "demo" ? (
                <p className="text-subtle bg-soft rounded-xl px-4 py-3 text-sm">
                  {shareKitCopy.demoOff}
                </p>
              ) : (
                <ShareChannels caption={caption} url={row.url} title={product} />
              )}
            </section>
          ) : null}
          <section className="grid gap-2">
            <label htmlFor="share-caption" className="text-ink text-sm font-medium">
              {shareKitCopy.captionLabel}
            </label>
            <Textarea
              id="share-caption"
              rows={4}
              maxLength={1000}
              value={caption}
              onChange={(event) => {
                setEdited(event.target.value);
              }}
            />
            <p className="text-subtle text-sm">{shareKitCopy.captionHelp}</p>
            <p aria-live="polite" className="text-amber-ink text-sm">
              {disclosed(caption) ? "" : shareKitCopy.captionWarning}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="justify-self-start"
              disabled={caption.trim().length === 0}
              onClick={() => void copy(caption, toasts["T-01"].copy.caption)}
            >
              {shareKitCopy.copyCaption}
            </Button>
          </section>
          <EmbedCard url={row.url} product={product} merchant={merchant} />
          <section className="border-hairline grid gap-1 border-t pt-4 text-sm">
            {stats.data && earned !== null ? (
              <p className="text-body">
                {fill(shareKitCopy.stats, {
                  opens: String(stats.data.visitsEstimate),
                  settled: String(stats.data.sales.finalized),
                  pending: String(stats.data.sales.pending),
                  earned: formatAmount(earned, row.campaign.token),
                })}
              </p>
            ) : null}
            {stats.error ? <p className="text-subtle">{shareKitCopy.statsUnavailable}</p> : null}
            <p className="text-subtle">{shareKitCopy.statsHelp}</p>
          </section>
        </div>
      ) : null}
    </Sheet>
  );
}
