export const demoFlow = {
  linkInLive: "This looks like a demo link. Demo links only work in demo mode.",
  noRecovery: "Account recovery isn’t available in demo mode.",
  noStorage: "Demo progress won’t be saved in this browser.",
  playgroundLive:
    "The playground always calls the live public API. Demo data isn’t served by the API.",
  reset: "Demo was reset.",
} as const satisfies Record<string, string>;
