"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { routes } from "@/lib/routes";
import { navLinks } from "./nav-links";

const bar =
  "bg-ink ease-spring absolute left-[11px] h-[1.5px] w-[18px] rounded-full transition-transform duration-[423ms]";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
        className="relative size-10 rounded-full"
      >
        <span
          aria-hidden="true"
          className={`${bar} top-[19px] ${open ? "rotate-45" : "-translate-y-[3.5px]"}`}
        />
        <span
          aria-hidden="true"
          className={`${bar} top-[19px] ${open ? "-rotate-45" : "translate-y-[3.5px]"}`}
        />
      </button>
      <nav
        id="mobile-menu"
        aria-label="Mobile"
        className={`bg-page ease-spring absolute inset-x-0 top-full h-[calc(100dvh-72px)] overflow-y-auto px-5 pt-2 pb-10 transition-[opacity,visibility] duration-[423ms] ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <ul className="flex flex-col">
          {[...navLinks, { label: "Explore campaigns", href: routes.explore }].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => {
                  setOpen(false);
                }}
                className="text-ink hover:text-body block py-3 text-lg font-medium"
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
