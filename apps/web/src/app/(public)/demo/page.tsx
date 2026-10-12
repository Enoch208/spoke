import { PageSkeleton } from "@/components/product/page";
import { DemoPage } from "@/components/platform/demo-page";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DemoPage />
    </Suspense>
  );
}
