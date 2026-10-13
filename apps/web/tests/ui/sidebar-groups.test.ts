import { describe, expect, it } from "vitest";
import { discoverNav, navForArea } from "@/components/app/nav";
import { sidebarGroupsFor } from "@/components/app/shell/sidebar-groups";

describe("grouped sidebar navigation", () => {
  it.each(["earn", "sell", "ops"] as const)(
    "keeps every %s destination accessible exactly once",
    (area) => {
      const groups = sidebarGroupsFor(area);
      const actual = groups.flatMap((group) => group.items.map((item) => item.id));
      const expected = [...discoverNav, ...navForArea(area)].map((item) => item.id);
      expect(actual.toSorted()).toEqual(expected.toSorted());
      expect(new Set(actual).size).toBe(actual.length);
      expect(new Set(groups.map((group) => group.id)).size).toBe(groups.length);
    },
  );
});
