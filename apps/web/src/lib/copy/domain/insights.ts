import {
  Alert01Icon,
  Analytics01Icon,
  MinusSignCircleIcon,
  SearchRemoveIcon,
} from "@hugeicons/core-free-icons";
import type { ExplainedChip } from "../types";

export const insightStateCopy = {
  available: {
    label: "From Nansen",
    icon: Analytics01Icon,
    tone: "ink",
    explainer: "Fetched {date}. Context only; never used for payouts.",
  },
  notFetched: {
    label: "Not available",
    icon: MinusSignCircleIcon,
    tone: "faint",
    explainer: "Insights aren’t available for this address.",
  },
  noCoverage: {
    label: "No outside activity",
    icon: SearchRemoveIcon,
    tone: "faint",
    explainer:
      "Nansen has no labelled activity for this address on the networks it covers. That says nothing about this person’s results on Spoke.",
  },
  error: {
    label: "Couldn’t load",
    icon: Alert01Icon,
    tone: "amber",
    explainer: "Insights couldn’t load. Settled results on Spoke are unaffected.",
  },
} as const satisfies Record<string, ExplainedChip>;

export type InsightStateKey = keyof typeof insightStateCopy;
