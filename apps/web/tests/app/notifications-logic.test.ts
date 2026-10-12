import { describe, expect, it } from "vitest";
import { groupByDay, unreadIn } from "@/components/app/notifications-logic";

const item = (id: string, createdAt: string, readAt: string | null = null) => ({
  id,
  createdAt,
  readAt,
});

describe("groupByDay", () => {
  const now = new Date("2026-10-12T15:00:00Z");

  it("puts notifications from the same local day under today", () => {
    const groups = groupByDay(
      [item("a", "2026-10-12T00:10:00Z"), item("b", "2026-10-11T23:50:00Z")],
      now,
      "UTC",
    );
    expect(groups.today.map((entry) => entry.id)).toEqual(["a"]);
    expect(groups.earlier.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("uses the viewer's time zone for the day boundary", () => {
    const groups = groupByDay([item("b", "2026-10-11T23:50:00Z")], now, "Africa/Lagos");
    expect(groups.today.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("keeps the order it was given within each group", () => {
    const groups = groupByDay(
      [item("a", "2026-10-12T12:00:00Z"), item("b", "2026-10-12T09:00:00Z")],
      now,
      "UTC",
    );
    expect(groups.today.map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});

describe("unreadIn", () => {
  it("counts the notifications without a read time", () => {
    expect(
      unreadIn([
        item("a", "2026-10-12T12:00:00Z"),
        item("b", "2026-10-12T09:00:00Z", "2026-10-12T10:00:00Z"),
      ]),
    ).toBe(1);
  });
});
