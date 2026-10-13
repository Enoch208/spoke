const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const formatDay = (date: Date) =>
  `${String(date.getDate())} ${months[date.getMonth()] ?? ""} ${String(date.getFullYear())}`;

export const dayKeyOf = (date: Date) =>
  `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;

export const dayGroup = (date: Date, now: Date): "today" | "yesterday" | "earlier" => {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKeyOf(date) === dayKeyOf(now)) return "today";
  if (dayKeyOf(date) === dayKeyOf(yesterday)) return "yesterday";
  return "earlier";
};
