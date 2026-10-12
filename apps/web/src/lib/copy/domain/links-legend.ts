import {
  ArrowTurnBackwardIcon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  Route01Icon,
  Share08Icon,
  ShoppingBag01Icon,
  Store01Icon,
  UserIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

type LegendMark = {
  readonly label: string;
  readonly icon: IconSvgElement | null;
  readonly muted?: true;
};

export const graphLegendCopy = {
  merchant: { label: "Merchant", icon: Store01Icon },
  shared: { label: "Shared", icon: Share08Icon },
  viewed: { label: "Viewed (estimated)", icon: ViewIcon },
  purchased: { label: "Purchased", icon: ShoppingBag01Icon },
  pending: { label: "Pending", icon: Clock01Icon },
  settled: { label: "Settled", icon: CheckmarkBadge01Icon },
  refunded: { label: "Refunded", icon: ArrowTurnBackwardIcon },
  paidPath: { label: "Paid path for sale #{saleId}", icon: Route01Icon },
  notPaid: { label: "Not paid on this sale", icon: null, muted: true },
  reader: { label: "You", icon: UserIcon },
} as const satisfies Record<string, LegendMark>;

export type GraphLegendKey = keyof typeof graphLegendCopy;
