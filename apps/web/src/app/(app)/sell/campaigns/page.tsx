import { Suspense } from "react";
import { PageSkeleton } from "@/components/product/page";
import { CampaignsPage } from "@/components/sell/core/campaigns/campaigns-page";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton shape="rows" />}>
      <CampaignsPage />
    </Suspense>
  );
}
