import Link from "next/link";
import type { ReactNode } from "react";
import { BannerStack } from "@/components/app/banners";
import { GlobalLayer } from "@/components/app/global-layer";
import { Providers } from "@/components/app/providers";
import { FocusedClose } from "@/components/app/shell/focused-close";
import { BrandMark } from "@/components/ui/brand-mark";
import { routes } from "@/lib/routes";

export default function FocusedLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="bg-page flex min-h-dvh flex-col">
        <header className="border-hairline bg-page/85 sticky top-0 z-30 border-b backdrop-blur-[30px]">
          <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-4 sm:px-6">
            <Link href={routes.explore} className="inline-flex items-center gap-2">
              <BrandMark height={24} />
              <span className="font-display text-[22px] leading-none font-extrabold tracking-[-0.03em]">
                Spoke
              </span>
            </Link>
            <FocusedClose />
          </div>
        </header>
        <BannerStack surface="public" />
        <main className="font-ui mx-auto w-full max-w-[1120px] flex-1 px-4 py-6 sm:px-6 lg:py-10">
          {children}
        </main>
      </div>
      <GlobalLayer />
    </Providers>
  );
}
