import Link from "next/link";
import type { ReactNode } from "react";
import { GlobalLayer } from "@/components/app/global-layer";
import { Providers } from "@/components/app/providers";
import { AuthBrandPanel } from "@/components/account/auth/brand-panel";
import { BrandMark } from "@/components/ui/brand-mark";
import { routes } from "@/lib/routes";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="bg-page grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
          <Link href={routes.home} className="inline-flex w-fit items-center gap-2">
            <BrandMark height={26} priority />
            <span className="font-display text-[24px] leading-none font-extrabold tracking-[-0.03em]">
              Spoke
            </span>
          </Link>
          <main className="font-ui flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[400px]">{children}</div>
          </main>
        </div>
        <AuthBrandPanel />
      </div>
      <GlobalLayer />
    </Providers>
  );
}
