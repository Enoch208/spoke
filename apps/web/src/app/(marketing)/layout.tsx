import type { ReactNode } from "react";
import { MarketingIsland } from "@/components/app/marketing-island";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <MarketingIsland />
      {children}
      <SiteFooter />
    </>
  );
}
