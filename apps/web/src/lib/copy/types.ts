import type { IconSvgElement } from "@hugeicons/react";
import type { Tone } from "../../components/ui/tone";

export type Chip = {
  readonly label: string;
  readonly icon: IconSvgElement;
  readonly tone: Tone;
};

export type ExplainedChip = Chip & { readonly explainer: string };

export type Message = {
  readonly title: string;
  readonly body: string;
};

export type MessageWithActions = Message & { readonly actions: readonly string[] };

export type Retryable = "yes" | "afterFix" | "no";

export type ErrorMessage = Message & {
  readonly recovery: readonly string[];
  readonly retryable: Retryable;
};
