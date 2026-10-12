import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/account/auth/auth-panel";

export const metadata: Metadata = { title: "Create your account · Spoke" };

export default function Page() {
  return (
    <Suspense>
      <AuthPanel kind="signup" />
    </Suspense>
  );
}
