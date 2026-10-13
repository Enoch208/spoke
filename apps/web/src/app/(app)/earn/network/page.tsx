import { Suspense } from "react";
import { NetworkPage } from "@/components/earn/network/network-page";
import { PageSkeleton } from "@/components/product/page";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NetworkPage />
    </Suspense>
  );
}
