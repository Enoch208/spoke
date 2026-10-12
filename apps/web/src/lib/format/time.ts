const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const minute = 60;
const hour = 3600;
const day = 86_400;

export type TimeOptions = { now?: Date; timeZone?: string };

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
  second: string;
};

const partsOf = (date: Date, timeZone: string | undefined): Parts => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...(timeZone ? { timeZone } : {}),
  });
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    formatter.formatToParts(date).find((part) => part.type === type)?.value ?? "0";
  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
};

const monthName = (month: number) => monthNames[month - 1] ?? "";

export const formatDateTime = (date: Date, options: TimeOptions = {}) => {
  const parts = partsOf(date, options.timeZone);
  const currentYear = partsOf(options.now ?? new Date(), options.timeZone).year;
  const yearPart = parts.year === currentYear ? "" : ` ${String(parts.year)}`;
  return `${String(parts.day)} ${monthName(parts.month)}${yearPart}, ${parts.hour}:${parts.minute}`;
};

const offsetName = (date: Date, timeZone: string | undefined) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZoneName: "shortOffset",
    ...(timeZone ? { timeZone } : {}),
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? "GMT";

export const formatTimestampFull = (date: Date, options: Pick<TimeOptions, "timeZone"> = {}) => {
  const parts = partsOf(date, options.timeZone);
  const local = `${String(parts.day)} ${monthName(parts.month)} ${String(parts.year)}, ${parts.hour}:${parts.minute}:${parts.second}`;
  const iso = date.toISOString().replace(/\.\d{3}Z$/, "Z");
  return `${local} ${offsetName(date, options.timeZone)} · ${iso}`;
};

const unitParts = (totalSeconds: number) => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return [
    { value: Math.floor(seconds / day), label: (n: number) => (n === 1 ? "day" : "days") },
    { value: Math.floor((seconds % day) / hour), label: () => "h" },
    { value: Math.floor((seconds % hour) / minute), label: () => "min" },
    { value: seconds % minute, label: () => "s" },
  ];
};

const firstUnits = (totalSeconds: number, count: number) => {
  const units = unitParts(totalSeconds);
  const start = units.findIndex((unit) => unit.value > 0);
  if (start === -1) return "0 s";
  return units
    .slice(start, start + count)
    .filter((unit) => unit.value > 0)
    .map((unit) => `${String(unit.value)} ${unit.label(unit.value)}`)
    .join(" ");
};

export const formatDuration = (totalSeconds: number) =>
  totalSeconds <= minute
    ? `${String(Math.max(0, Math.floor(totalSeconds)))} s`
    : firstUnits(totalSeconds, 2);

export const formatCountdown = (totalSeconds: number) => firstUnits(totalSeconds, 2);

const singularUnits = [
  { seconds: day, name: "day" },
  { seconds: hour, name: "hour" },
  { seconds: minute, name: "minute" },
  { seconds: 1, name: "second" },
] as const;

const article = (value: number) => (/^(8|11|18)/.test(String(value)) && value !== 1 ? "an" : "a");

export const formatHoldPhrase = (totalSeconds: number) => {
  const unit = singularUnits.find((candidate) => totalSeconds % candidate.seconds === 0);
  if (!unit || totalSeconds <= 0) return `a ${formatDuration(totalSeconds)} hold`;
  const value = totalSeconds / unit.seconds;
  return `${article(value)} ${String(value)}-${unit.name} hold`;
};

export const formatRelative = (date: Date, options: TimeOptions = {}) => {
  const now = options.now ?? new Date();
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const distance = Math.abs(diffSeconds);
  if (distance < minute) return "just now";
  if (distance >= day) return formatDateTime(date, options);
  if (diffSeconds < 0) {
    return distance < hour
      ? `${String(Math.floor(distance / minute))} min ago`
      : `${String(Math.floor(distance / hour))} h ago`;
  }
  return `in ${firstUnits(distance - (distance % minute), 2)}`;
};

export const formatDateRange = (
  start: Date,
  end: Date,
  options: Pick<TimeOptions, "timeZone"> = {},
) => {
  const a = partsOf(start, options.timeZone);
  const b = partsOf(end, options.timeZone);
  if (a.year === b.year && a.month === b.month) {
    return `${String(a.day)}–${String(b.day)} ${monthName(b.month)} ${String(b.year)}`;
  }
  const startYear = a.year === b.year ? "" : ` ${String(a.year)}`;
  return `${String(a.day)} ${monthName(a.month)}${startYear} – ${String(b.day)} ${monthName(b.month)} ${String(b.year)}`;
};
