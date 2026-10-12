"use client";

import { Cancel01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { routes } from "@/lib/routes";
import { navLinks } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex size-10 items-center justify-center rounded-full"
      >
        <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} size={24} aria-hidden="true" />
      </button>
      <nav
        id="mobile-menu"
        hidden={!open}
        className="bg-page/95 border-line absolute inset-x-0 top-[72px] border-b px-5 pt-2 pb-6 backdrop-blur"
      >
        <ul className="flex flex-col">
          {[...navLinks, { label: "Explore campaigns", href: routes.explore }].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => {
                  setOpen(false);
                }}
                className="text-ink block py-3 text-lg font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
