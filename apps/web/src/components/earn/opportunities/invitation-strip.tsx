"use client";

import type { ClientOutput } from "@spoke/protocol";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { opportunitiesCopy as copy } from "../copy/opportunities";

type Invitation = ClientOutput<"invitations.mine">["items"][number];

function Strip({ invitation }: { invitation: Invitation }) {
  const campaign = useClientQuery("campaigns.get", { campaignId: invitation.campaignId });
  if (!campaign.data) return null;
  return (
    <div className="bg-lilac-soft flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <p className="text-ink flex items-center gap-2 text-sm">
        <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
        {fill(copy.invitation, {
          merchant: campaign.data.merchant.name,
          product: campaign.data.product.title,
        })}
      </p>
      <Button asChild size="sm" variant="secondary">
        <Link href={`${routes.earn.invitations}?id=${encodeURIComponent(invitation.id)}`}>
          {copy.viewInvitation}
        </Link>
      </Button>
    </div>
  );
}

export function InvitationStrip({ invitations }: { invitations: readonly Invitation[] }) {
  const [first] = invitations;
  return first ? <Strip invitation={first} /> : null;
}
