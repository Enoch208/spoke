import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { routes } from "@/lib/routes";
import { discoverSwitchCopy } from "../copy/explore";

const items = [
  { key: "campaigns", href: routes.explore, label: discoverSwitchCopy.campaigns },
  { key: "distributors", href: routes.distributors, label: discoverSwitchCopy.distributors },
] as const;

export function DiscoverSwitch({ active }: { active: "campaigns" | "distributors" }) {
  return (
    <nav
      aria-label={discoverSwitchCopy.label}
      className="bg-pill inline-flex h-11 shrink-0 items-center gap-1 rounded-3xl p-1"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === active ? "page" : undefined}
          className={cx(
            "font-ui ease-spring flex h-9 items-center rounded-3xl px-4 text-sm font-medium transition-colors duration-[423ms]",
            item.key === active
              ? "bg-surface text-ink shadow-[0_1px_2px_rgba(26,26,26,0.08)]"
              : "text-subtle hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
