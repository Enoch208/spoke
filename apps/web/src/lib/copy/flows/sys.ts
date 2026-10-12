export const sysFlow = {
  notFound: "Page not found",
  error: "Something went wrong",
  noStorage:
    "This browser isn’t saving Spoke data, so unfinished steps won’t survive closing the tab.",
} as const satisfies Record<string, string>;
