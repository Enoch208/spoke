import type { EmptyStateCopy } from "./shape";

export const platformEmptyStates = {
  "ES-70": {
    list: "Command palette search (M-39)",
    title: "No results for “{query}”",
    body: "Search campaigns, links and sales by name or ID, and people by handle or address.",
  },
  "ES-71": {
    list: "Third-party clients (DEV-09, demo)",
    title: "No apps listed yet",
    body: "Apps built on Spoke’s public API and contracts appear here.",
    actions: ["Read the API"],
  },
  "ES-72": {
    list: "Risk queue (OPS-01)",
    title: "Queue is clear",
    body: "Cases appear here when risk rules flag a sale, link or merchant.",
  },
  "ES-73": {
    list: "Moderation (OPS-03)",
    title: "No reports to review",
    body: "Reports from users and automatic checks appear here.",
  },
  "ES-74": {
    list: "Audit log (OPS-04), filtered",
    title: "No entries for this filter",
    body: "Every operator action is recorded; widen the date range to see more.",
    actions: ["Clear filters"],
  },
} as const satisfies Record<string, EmptyStateCopy>;
