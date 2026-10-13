const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso));
