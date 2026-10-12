import { common } from "../common";
import type { GlobalStateCopy } from "./shape";

export const readStates = {
  loading: {
    body: common.takingLonger,
    actions: ["Try again"],
    hiddenLabel: common.loadingSection,
    graphLabel: "Loading the network…",
  },
  refreshing: { body: "Updating" },
  stale: { body: "Couldn’t refresh. Showing data from {relativeTime}.", actions: ["Try again"] },
  emptyFirstUse: {},
  emptyFiltered: {
    title: "No {items} match these filters",
    searchTitle: "No results for “{query}”",
    body: "Try removing a filter or checking the spelling.",
    actions: ["Clear filters"],
  },
  errorRetryable: {
    title: "Couldn’t load {sectionName}",
    body: "Check your connection and try again.",
    actions: ["Try again", "Details"],
  },
  errorFatal: {
    title: "Something went wrong",
    body: "This page hit an error we didn’t expect. Nothing was sent from your account.",
    actions: ["Reload page", "Go home", "Report a problem"],
  },
  rateLimited: {
    title: "Too many requests",
    body: "Wait a moment and try again.",
    retryAfterBody: "Wait {seconds} s and try again.",
    actions: ["Try again"],
  },
  notFound: {},
  unauthorised: {},
} as const satisfies Record<string, GlobalStateCopy>;
