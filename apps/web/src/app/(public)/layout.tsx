import type { ReactNode } from "react";
import { GlobalLayer } from "@/components/app/global-layer";
import { Providers } from "@/components/app/providers";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { BannerStack } from "@/components/app/banners";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <SiteHeader />
      <BannerStack surface="public" />
      {children}
      <SiteFooter />
      <GlobalLayer />
    </Providers>
  );
}
