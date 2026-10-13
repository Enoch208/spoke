import {
  Add01Icon,
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  DiamondIcon,
  Link01Icon,
  Route01Icon,
  ShoppingBag01Icon,
  Store01Icon,
  UserIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cx } from "@/components/ui/cx";
import { graphLegendCopy } from "@/lib/copy";
import { explorerCopy, graphCopy } from "./copy";

const items: readonly { key: string; label: string; icon: IconSvgElement; swatch: string }[] = [
  {
    key: "merchant",
    label: graphLegendCopy.merchant.label,
    icon: Store01Icon,
    swatch: "bg-ink text-page rounded-md",
  },
  {
    key: "you",
    label: graphLegendCopy.reader.label,
    icon: UserIcon,
    swatch: "bg-surface ring-2 ring-ink rounded-full",
  },
  {
    key: "shared",
    label: graphLegendCopy.shared.label,
    icon: Link01Icon,
    swatch: "bg-surface border border-control-edge rounded-full",
  },
  {
    key: "viewed",
    label: graphLegendCopy.viewed.label,
    icon: ViewIcon,
    swatch: "bg-surface border border-control-edge rounded-full",
  },
  {
    key: "purchased",
    label: graphLegendCopy.purchased.label,
    icon: ShoppingBag01Icon,
    swatch: "bg-lime-soft border border-control-edge rounded-full",
  },
  {
    key: "pending",
    label: graphLegendCopy.pending.label,
    icon: Clock01Icon,
    swatch: "bg-amber-soft text-amber-ink rounded-full",
  },
  {
    key: "settled",
    label: graphLegendCopy.settled.label,
    icon: CheckmarkBadge01Icon,
    swatch: "bg-lime-soft text-lime-ink rounded-full",
  },
  {
    key: "refunded",
    label: graphLegendCopy.refunded.label,
    icon: ArrowTurnBackwardIcon,
    swatch: "bg-pink-soft text-pink-ink rounded-full",
  },
  {
    key: "buyer",
    label: graphCopy.buyer,
    icon: DiamondIcon,
    swatch: "bg-surface border border-ink rotate-45 rounded-sm",
  },
  {
    key: "path",
    label: explorerCopy.paidPath,
    icon: Route01Icon,
    swatch: "bg-olive text-lime rounded-full",
  },
  {
    key: "off",
    label: graphCopy.notOnPath,
    icon: Route01Icon,
    swatch: "bg-surface border border-dashed border-faint opacity-60 rounded-full",
  },
  {
    key: "more",
    label: explorerCopy.expandBranch,
    icon: Add01Icon,
    swatch: "bg-pill border border-line rounded-full",
  },
];

export function Legend({ className }: { className?: string }) {
  return (
    <section aria-label={explorerCopy.legend} className={cx("grid gap-2", className)}>
      <h3 className="text-ink text-xs font-medium">{explorerCopy.legend}</h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="text-body flex items-center gap-2 text-xs">
            <span className={cx("flex size-5 shrink-0 items-center justify-center", item.swatch)}>
              <HugeiconsIcon
                icon={item.icon}
                size={11}
                strokeWidth={2}
                aria-hidden="true"
                className={item.key === "buyer" ? "-rotate-45" : undefined}
              />
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
