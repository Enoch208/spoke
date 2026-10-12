"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUiStore } from "@/lib/stores/ui";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";

const destinations = [
  ["Explore campaigns", "/explore"],
  ["Earnings", "/earn"],
  ["My links", "/earn/links"],
  ["Purchases", "/purchases"],
  ["Merchant overview", "/sell"],
  ["Create campaign", "/sell/campaigns/new"],
  ["Products", "/sell/products"],
  ["Vault", "/sell/vault"],
  ["Developers", "/developers"],
  ["Account settings", "/settings/profile"],
];

export function CommandPalette() {
  const open = useUiStore((state) => state.paletteOpen);
  const setOpen = useUiStore((state) => state.setPaletteOpen);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!useUiStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [setOpen]);
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Go to" size="md">
      <Input
        aria-label="Find a page"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        placeholder="Find a page…"
      />
      <nav className="mt-4 grid gap-1">
        {destinations
          .filter(([label]) => label?.toLowerCase().includes(query.toLowerCase()))
          .map(([label, href]) =>
            href ? (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  setOpen(false);
                }}
                className="hover:bg-pill rounded-xl px-3 py-2"
              >
                {label}
              </Link>
            ) : null,
          )}
      </nav>
    </Dialog>
  );
}
