"use client";

import {
  Copy01Icon,
  LinkSquare02Icon,
  MoreHorizontalIcon,
  QrCodeIcon,
  Route01Icon,
  Share08Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Popover } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { routeTo, routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { linksPageCopy as copy } from "../copy/links-page";
import type { LinkRow } from "../shared/campaigns";
import { useCopyLink } from "../shared/link-field";
import { linkStatus, shareBlockedReason } from "../shared/link-status";

const item =
  "hover:bg-soft ease-spring flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors duration-[423ms]";

function Item({ icon, children }: { icon: IconSvgElement; children: ReactNode }) {
  return (
    <>
      <HugeiconsIcon
        icon={icon}
        size={18}
        strokeWidth={1.8}
        aria-hidden="true"
        className="text-subtle"
      />
      {children}
    </>
  );
}

export function ShareButton({ link }: { link: LinkRow }) {
  const open = useUiStore((state) => state.open);
  const blocked = shareBlockedReason(linkStatus(link));
  return (
    <Button
      block
      icon={Share08Icon}
      disabled={blocked !== null}
      {...(blocked ? { disabledReason: blocked } : {})}
      onClick={() => open("M-13", { nodeId: link.nodeId })}
    >
      {copy.share}
    </Button>
  );
}

export const networkHref = (link: LinkRow) =>
  `${routes.earn.network}?campaign=${encodeURIComponent(link.campaign.campaignId)}&node=${encodeURIComponent(link.nodeId)}`;

export function LinkActions({ link, share = true }: { link: LinkRow; share?: boolean }) {
  const open = useUiStore((state) => state.open);
  const copyLink = useCopyLink();
  const [menu, setMenu] = useState(false);
  const blocked = shareBlockedReason(linkStatus(link));
  const gated = (button: ReactNode) =>
    blocked ? (
      <Tooltip content={blocked}>
        <span tabIndex={0} className="inline-flex rounded-full">
          {button}
        </span>
      </Tooltip>
    ) : (
      button
    );
  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {share
        ? gated(
            <IconButton
              icon={Share08Icon}
              label={copy.share}
              size="sm"
              disabled={blocked !== null}
              onClick={() => open("M-13", { nodeId: link.nodeId })}
            />,
          )
        : null}
      {gated(
        <IconButton
          icon={QrCodeIcon}
          label={copy.qr}
          size="sm"
          disabled={blocked !== null}
          onClick={() => open("M-14", { url: link.url, title: link.campaign.product.title })}
        />,
      )}
      <Popover
        open={menu}
        onOpenChange={setMenu}
        title={copy.more}
        width={280}
        trigger={<IconButton icon={MoreHorizontalIcon} label={copy.more} size="sm" />}
      >
        <div className="grid p-1.5">
          <button
            type="button"
            className={item}
            onClick={() => {
              setMenu(false);
              void copyLink(link.url);
            }}
          >
            <Item icon={Copy01Icon}>{copy.copyLink}</Item>
          </button>
          <a href={routeTo.referral(link.code)} target="_blank" rel="noreferrer" className={item}>
            <Item icon={LinkSquare02Icon}>{copy.openReferral}</Item>
          </a>
          <Link href={networkHref(link)} className={item}>
            <Item icon={Route01Icon}>{copy.seeNetwork}</Item>
          </Link>
          <Link href={routeTo.campaign(link.campaign.campaignId)} className={item}>
            <Item icon={Store01Icon}>{copy.openCampaign}</Item>
          </Link>
        </div>
      </Popover>
    </div>
  );
}
