"use client";

import { Share08Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { isSupportedChainId } from "@spoke/protocol";
import Link from "next/link";
import { Address } from "@/components/ui/address";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCopy } from "@/components/ui/use-copy";
import { useClientContext } from "@/lib/client/provider";
import { fill, globalStates } from "@/lib/copy";
import { formatHandle } from "@/lib/format";
import { useClientQuery } from "@/lib/query/use-client";
import { routes, routeTo } from "@/lib/routes";
import { useSessionStore } from "@/lib/stores/session";
import { useUiStore } from "@/lib/stores/ui";
import { activeChain } from "@/lib/wagmi";
import { profileCopy } from "../copy/profile";
import { formatMonthYear } from "../shared/dates";
import { hasModal } from "../shared/modals-ready";
import { profileName, type AnyProfile } from "./types";

function useCategoryNames() {
  const categories = useClientQuery("products.categories", {});
  return (id: string) => categories.data?.find((category) => category.id === id)?.name ?? id;
}

export function IdentityCard({ profile, owner }: { profile: AnyProfile; owner: boolean }) {
  const { mode } = useClientContext();
  const copy = useCopy();
  const open = useUiStore((state) => state.open);
  const isMerchant = useSessionStore((state) => state.isMerchant);
  const subject = profile.subject;
  const card = useClientQuery(
    "distributors.get",
    { address: subject ?? "0x0000000000000000000000000000000000000000" },
    { enabled: subject !== null },
  );
  const categoryName = useCategoryNames();
  const name = profileName(profile) ?? profileCopy.fallbackTitle;
  const chainId = isSupportedChainId(activeChain.id) ? activeChain.id : null;
  const categories = card.data?.categories.slice(0, 5) ?? [];
  return (
    <Card padding="lg" className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <Avatar seed={profile.handle ?? name} name={name} size="xl" className="max-sm:size-16" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-h4 text-ink font-medium">
            {profile.handle ? formatHandle(profile.handle) : name}
          </p>
          {mode === "demo" ? <Badge>{globalStates.demoMode.sampleLabel}</Badge> : null}
        </div>
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <Badge key={category} tone="ink">
                {categoryName(category)}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="text-subtle flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {subject && chainId ? (
            <Address
              address={subject}
              chainId={chainId}
              showAddress
              demo={mode === "demo"}
              explorer={mode === "live"}
            />
          ) : null}
          {profile.evidencePeriod.from ? (
            <span>
              {fill(profileCopy.firstSale, {
                date: formatMonthYear(profile.evidencePeriod.from),
              })}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
        <Button
          variant="secondary"
          icon={Share08Icon}
          disabled={profile.visibility === "private" || !(profile.handle ?? profile.subject)}
          onClick={() => {
            const identity = profile.handle ?? profile.subject;
            if (identity)
              void copy(
                `${window.location.origin}${routeTo.profile(identity)}`,
                profileCopy.shareCopied,
              );
          }}
        >
          {profileCopy.share}
        </Button>
        {isMerchant && !owner && subject && profile.acceptsInvitations && hasModal("M-28") ? (
          <Button
            icon={UserAdd01Icon}
            onClick={() => {
              open("M-28", { address: subject });
            }}
          >
            {profileCopy.invite}
          </Button>
        ) : null}
        {owner ? (
          <Button asChild variant="ghost">
            <Link href={routes.settings.profile}>{profileCopy.edit}</Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
