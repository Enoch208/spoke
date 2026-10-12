const desktopLimit = 3;

export const visibleToasts = <Entry>(entries: readonly Entry[], phone: boolean) => ({
  items: entries.slice(phone ? -1 : -desktopLimit),
  count: entries.length,
});

export const remainingAfterRun = (remainingMs: number, runningSince: number, now: number) =>
  Math.max(0, remainingMs - (now - runningSince));
