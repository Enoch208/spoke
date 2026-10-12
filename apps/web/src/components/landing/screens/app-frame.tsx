import {
  Home01Icon,
  HierarchyIcon,
  SlidersHorizontalIcon,
  SourceCodeIcon,
  Store01Icon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/brand-mark";

const railIcons = [
  { key: "home", icon: Home01Icon },
  { key: "marketplace", icon: Store01Icon },
  { key: "network", icon: HierarchyIcon },
  { key: "studio", icon: SlidersHorizontalIcon },
  { key: "reputation", icon: UserStar01Icon },
  { key: "developers", icon: SourceCodeIcon },
] as const;

export type RailKey = (typeof railIcons)[number]["key"];

export function AppFrame({
  active,
  title,
  actions,
  children,
}: {
  active: RailKey;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="font-ui bg-surface text-ink flex size-full overflow-hidden rounded-lg shadow-[0_1px_1px_rgba(0,0,0,0.08),0_3px_6px_-2px_rgba(0,0,0,0.08),0_12px_32px_-6px_rgba(0,0,0,0.12)]">
      <aside className="border-hairline flex w-[52px] shrink-0 flex-col items-center gap-2 border-r py-3">
        <span className="bg-lime-soft mb-2 flex size-7 items-center justify-center rounded-md">
          <BrandMark height={18} />
        </span>
        {railIcons.map(({ key, icon }) => (
          <span
            key={key}
            className={`flex size-8 items-center justify-center rounded-md ${key === active ? "bg-pill text-ink" : "text-faint"}`}
          >
            <HugeiconsIcon icon={icon} size={16} aria-hidden="true" />
          </span>
        ))}
      </aside>
      <div className="bg-soft flex min-w-0 flex-1 flex-col px-9 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-[24px] leading-none font-medium tracking-[-0.01em]">{title}</p>
            <span className="border-line text-subtle rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              Illustration
            </span>
          </div>
          {actions}
        </div>
        <div className="mt-6 min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
