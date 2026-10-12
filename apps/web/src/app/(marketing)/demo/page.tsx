import { DemoPage } from "@/components/platform/demo-page";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Loading…</p>}>
      <DemoPage />
    </Suspense>
  );
}
