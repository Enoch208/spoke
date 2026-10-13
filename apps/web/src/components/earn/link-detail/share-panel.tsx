"use client";

import { LinkSquare02Icon, QrCodeIcon, Share08Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-field";
import { routeTo } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { linkDetailCopy } from "../copy/link-detail";
import type { LinkRow } from "../shared/campaigns";
import { LinkField } from "../shared/link-field";
import { type LinkStatus } from "../shared/link-status";
import { Section } from "../shared/section";

const copy = linkDetailCopy.share;

export function SharePanel({ link, status }: { link: LinkRow; status: LinkStatus }) {
  const open = useUiStore((state) => state.open);
  const blocked = status === "closed" || status === "exhausted" || status === "hidden";
  return (
    <Section title={copy.title}>
      <div className="grid gap-4">
        <LinkField url={link.url} label={copy.copy} disabled={status === "hidden"} />
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap">
          <Button
            icon={Share08Icon}
            disabled={blocked}
            onClick={() => open("M-13", { nodeId: link.nodeId })}
          >
            {copy.share}
          </Button>
          <Button
            variant="secondary"
            icon={QrCodeIcon}
            disabled={blocked}
            onClick={() => open("M-14", { url: link.url, title: link.campaign.product.title })}
          >
            {copy.qr}
          </Button>
          <Button asChild variant="secondary" className="col-span-2">
            <a href={routeTo.referral(link.code)} target="_blank" rel="noreferrer">
              <HugeiconsIcon
                icon={LinkSquare02Icon}
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {copy.open}
            </a>
          </Button>
        </div>
        <div className="bg-soft flex items-start gap-3 rounded-xl p-4">
          <div className="grid min-w-0 flex-1 gap-1">
            <p className="text-ink text-sm font-medium">{copy.disclosureTitle}</p>
            <p className="text-body text-sm">{copy.disclosure}</p>
          </div>
          <CopyButton
            value={copy.disclosureText}
            label={copy.copyDisclosure}
            copiedMessage={copy.disclosureCopied}
          />
        </div>
      </div>
    </Section>
  );
}
