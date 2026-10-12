"use client";

import { usePathname } from "next/navigation";
import { ProductPage, PageLink } from "@/components/product/page";
import { Card } from "@/components/ui/card";

export function PreviewPage() {
  const pathname = usePathname();
  const name = pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "Workspace";
  return (
    <ProductPage title={name} description="This workspace is not available yet.">
      <Card>
        <p className="text-body">
          You can use product checkout, campaign management, sharing links, receipts and earnings
          today. This additional workspace has no enabled actions.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <PageLink href="/earn/opportunities">Find campaigns</PageLink>
          <PageLink href="/sell/campaigns">Manage campaigns</PageLink>
          <PageLink href="/developers/api">Inspect API coverage</PageLink>
        </div>
      </Card>
    </ProductPage>
  );
}
