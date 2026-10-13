"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProductPage, PageSkeleton } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui";
import { routes } from "@/lib/routes";
import { usePublicViewer } from "@/components/public/shared/viewer";
import { InvitationList } from "./invitation-list";

function Content() {
  const params = useSearchParams();
  const id = params.get("id") ?? params.get("invite");
  const opened = useRef<string | null>(null);
  const { known } = usePublicViewer();
  useEffect(() => {
    if (known && id && opened.current !== id) {
      opened.current = id;
      useUiStore.getState().open("M-46", { invitationId: id });
    }
  }, [known, id]);
  return (
    <ProductPage
      title="Invitations"
      description="Review campaign terms, accept an invitation and create your link. You earn only from real sales that settle."
      actions={
        <Button asChild variant="secondary">
          <Link href={routes.earn.reputation}>Invitation preferences</Link>
        </Button>
      }
    >
      {known ? <InvitationList /> : <PageSkeleton shape="rows" />}
    </ProductPage>
  );
}

export function InvitationsPage() {
  return (
    <Suspense fallback={<PageSkeleton shape="rows" />}>
      <Content />
    </Suspense>
  );
}
