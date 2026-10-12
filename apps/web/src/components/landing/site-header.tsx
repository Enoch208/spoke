import Link from "next/link";
import { ArrowLink } from "@/components/ui/arrow-link";
import { Logo } from "@/components/ui/logo";
import { PillLink } from "@/components/ui/pill-link";
import { routes } from "@/lib/routes";
import { MobileMenu } from "./mobile-menu";
import { navLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="bg-page/80 sticky top-0 z-40 backdrop-blur-[30px]">
      <div className="relative mx-auto flex h-[72px] max-w-[1160px] items-center justify-between px-5 lg:h-20 xl:px-0">
        <Logo priority />
        <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
          <ul className="flex items-center gap-5">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-ink hover:text-body font-medium">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <PillLink href={routes.explore}>Explore</PillLink>
          <ArrowLink href={routes.launch}>Launch</ArrowLink>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
