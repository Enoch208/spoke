type Dated = { createdAt: string; readAt: string | null };

const dayKey = (date: Date, timeZone: string | undefined) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const groupByDay = <Entry extends Dated>(
  entries: readonly Entry[],
  now: Date,
  timeZone?: string,
) => {
  const today = dayKey(now, timeZone);
  return {
    today: entries.filter((entry) => dayKey(new Date(entry.createdAt), timeZone) === today),
    earlier: entries.filter((entry) => dayKey(new Date(entry.createdAt), timeZone) !== today),
  };
};

export const unreadIn = (entries: readonly Dated[]) =>
  entries.filter((entry) => entry.readAt === null).length;
