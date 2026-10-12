import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/account/auth/auth-panel";

export const metadata: Metadata = { title: "Log in · Spoke" };

export default function Page() {
  return (
    <Suspense>
      <AuthPanel kind="login" />
    </Suspense>
  );
}
