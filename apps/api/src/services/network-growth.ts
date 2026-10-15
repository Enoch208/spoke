import type { ChainEvent } from "./evidence.js";

export function networkGrowth(rows: readonly ChainEvent[], now = new Date()) {
  const end = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const start = new Date(end.getTime() - 29 * 86_400_000);
  const unique = [...new Map(rows.map((event) => [event.id, event])).values()];
  let links = unique.filter((event) => event.name === "NodeCreated" && event.at < start).length;
  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10);
    const events = unique.filter((event) => event.at.toISOString().slice(0, 10) === day);
    const count = (name: string) => events.filter((event) => event.name === name).length;
    const newLinks = count("NodeCreated");
    links += newLinks;
    return {
      day,
      totalLinks: links,
      newLinks,
      purchases: count("NativePurchaseAccepted"),
      finalized: count("SaleFinalized"),
      refunded: count("SaleRefunded"),
    };
  });
}
