import { globalStates } from "../global-states";
import type { Message } from "../types";

type FeatureNotLiveDialogCopy = Message & {
  readonly actions: Readonly<Record<string, string>>;
};

const featureNotLive = globalStates.featureNotLive;

export const featureNotLiveDialog = {
  title: featureNotLive.title,
  body: featureNotLive.body,
  actions: { tryDemo: "Try it in demo mode", back: "Back", seeWhatsLive: "See what’s live" },
} as const satisfies FeatureNotLiveDialogCopy;
