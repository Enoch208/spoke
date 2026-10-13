"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { InsightsPanel } from "@/components/platform/insights-panel";
import { ProductPage, QueryState, PageSkeleton } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { useClientContext } from "@/lib/client/provider";
import { fill, required } from "@/lib/copy";
import { formatCount } from "@/lib/format";
import { publicEnv } from "@/lib/public-env";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { useUiStore } from "@/lib/stores/ui";
import { profileCopy } from "./copy/profile";
import { reportCopy } from "./copy/report";
import { Breakdown } from "./profile/breakdown";
import { IdentityCard } from "./profile/identity-card";
import { PrivateProfile, UnknownProfile } from "./profile/profile-states";
import { ReceiptsList } from "./profile/receipts-list";
import { StatTiles } from "./profile/stat-tiles";
import { methodologyLabel, profileName, type AnyProfile } from "./profile/types";
import { Callout } from "./shared/callout";
import { DemoLinkInLive, useIdentifierMatch } from "./shared/demo-link";
import { hasModal } from "./shared/modals-ready";
import { ReportButton } from "./shared/report-button";
import { usePublicViewer } from "./shared/viewer";

function OwnerBar({ profile }: { profile: AnyProfile }) {
  const open = useUiStore((state) => state.open);
  const change = hasModal("M-36") ? (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        open("M-36", {});
      }}
    >
      {profile.visibility === "private" ? profileCopy.makePublic : profileCopy.change}
    </Button>
  ) : (
    <Button asChild size="sm" variant="secondary">
      <Link href={routes.settings.privacy}>{profileCopy.change}</Link>
    </Button>
  );
  return (
    <Callout tone={profile.visibility === "private" ? "caution" : "info"} actions={change}>
      {profile.visibility === "private"
        ? profileCopy.privatePreview
        : fill(profileCopy.ownerBar, { visibility: profileCopy.visibility[profile.visibility] })}
    </Callout>
  );
}

function CountingStrip({ profile }: { profile: AnyProfile }) {
  return (
    <div className="bg-pill flex flex-col gap-1 rounded-2xl px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-ink">{required.reputation}</p>
      <p className="text-subtle flex shrink-0 items-center gap-3">
        <Link href={`${routes.trust}#reputation`} className="text-ink underline underline-offset-2">
          {profileCopy.howWeCount}
        </Link>
        <span>
          {fill(profileCopy.methodology, { version: methodologyLabel(profile.methodologyVersion) })}
        </span>
      </p>
    </div>
  );
}

function ProofFooter({ profile }: { profile: AnyProfile }) {
  const { mode } = useClientContext();
  if (mode !== "live" || !profile.handle) return null;
  const url = `${publicEnv.NEXT_PUBLIC_API_URL}/v1/distributors/${encodeURIComponent(profile.handle)}/profile`;
  return (
    <div className="flex flex-col gap-2">
      {profile.lastIndexedBlock ? (
        <p className="text-subtle text-sm">
          {fill(profileCopy.freshness, { block: formatCount(BigInt(profile.lastIndexedBlock)) })}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button asChild variant="secondary" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            {profileCopy.json}
          </a>
        </Button>
        <CopyField
          value={`GET ${url}`}
          label={profileCopy.copyApi}
          copiedMessage={profileCopy.apiCopied}
          className="min-w-0 flex-1"
        />
      </div>
    </div>
  );
}

function ProfileBody({
  profile,
  owner,
  children,
}: {
  profile: AnyProfile;
  owner: boolean;
  children?: ReactNode;
}) {
  const name = profileName(profile) ?? profileCopy.fallbackTitle;
  return (
    <ProductPage
      title={owner ? profileCopy.ownTitle : name}
      breadcrumbs={[{ label: profileCopy.crumb, href: routes.distributors }]}
    >
      {owner ? <OwnerBar profile={profile} /> : null}
      <IdentityCard profile={profile} owner={owner} />
      <CountingStrip profile={profile} />
      <StatTiles profile={profile} />
      <p className="text-subtle max-w-[70ch] text-sm">{profileCopy.note}</p>
      <Breakdown profile={profile} />
      <ReceiptsList profile={profile} name={name} />
      {children}
      <ProofFooter profile={profile} />
      <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-subtle text-sm">{profileCopy.optIn}</p>
        {owner ? null : (
          <ReportButton
            label={reportCopy.profile}
            target={{
              kind: "distributor",
              id: profile.handle ?? profile.subject ?? name,
              name,
            }}
          />
        )}
      </div>
    </ProductPage>
  );
}

function OwnProfile() {
  const profile = useClientQuery("reputation.mine", {});
  const { me } = usePublicViewer();
  return (
    <QueryState
      pending={profile.isPending}
      error={profile.error}
      retry={() => void profile.refetch()}
    >
      {profile.data ? (
        <ProfileBody profile={profile.data} owner>
          {me?.isMerchant && profile.data.subject ? (
            <InsightsPanel address={profile.data.subject} />
          ) : null}
        </ProfileBody>
      ) : null}
    </QueryState>
  );
}

function PublicProfile({ handle }: { handle: string }) {
  const profile = useClientQuery("reputation.get", { addressOrHandle: handle });
  const { me } = usePublicViewer();
  const code = profile.error?.code;
  if (code === "NOT_FOUND" || code === "VALIDATION_FAILED")
    return <UnknownProfile handle={handle} />;
  const data = profile.data;
  if (data && "hidden" in data) return <PrivateProfile />;
  const owner = Boolean(data && me?.handle && data.handle === me.handle);
  return (
    <QueryState
      pending={profile.isPending}
      error={profile.error}
      retry={() => void profile.refetch()}
    >
      {data ? (
        <ProfileBody profile={data} owner={owner}>
          {me?.isMerchant && data.subject ? <InsightsPanel address={data.subject} /> : null}
        </ProfileBody>
      ) : null}
    </QueryState>
  );
}

export function ProfilePage({ handle, own = false }: { handle?: string; own?: boolean }) {
  const match = useIdentifierMatch(handle ?? "");
  if (own) return <OwnProfile />;
  if (!handle) return <UnknownProfile handle="" />;
  if (match === "pending") return <PageSkeleton />;
  if (match === "demoInLive") return <DemoLinkInLive />;
  return <PublicProfile handle={handle} />;
}
